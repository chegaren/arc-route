// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IRouteRegistry {
    struct Ride {
        uint256 id;
        address driver;
        string origin;
        string destination;
        uint256 departureTime;
        uint8 totalSeats;
        uint8 availableSeats;
        uint256 pricePerSeat;
        bool active;
    }

    function getRide(uint256 rideId) external view returns (Ride memory);
    function decrementAvailableSeats(uint256 rideId) external;
    function incrementAvailableSeats(uint256 rideId) external;
}

contract RideEscrow is Ownable {
    enum BookingStatus {
        Active,
        Completed,
        CancelledByPassenger,
        CancelledByDriver
    }

    struct Booking {
        uint256 id;
        uint256 rideId;
        address passenger;
        address driver;
        uint256 departureTime;
        uint256 amountEscrowed;
        BookingStatus status;
    }

    IERC20 public immutable usdc;
    IRouteRegistry public routeRegistry;
    mapping(uint256 => Booking) public bookings;
    mapping(address => uint256) public pendingWithdrawals;
    uint256 public nextBookingId;

    uint256 public constant CANCELLATION_WINDOW = 1 hours;
    uint256 public platformFeeBps;
    address public feeRecipient;

    event SeatBooked(uint256 bookingId, uint256 rideId, address passenger, uint256 amount);
    event RideCompleted(uint256 bookingId, address driver, uint256 driverAmount, uint256 fee);
    event BookingCancelled(uint256 bookingId, BookingStatus status, uint256 refundAmount);
    event RouteRegistryUpdated(address indexed oldRegistry, address indexed newRegistry);
    event PlatformFeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    event WithdrawalPending(address indexed recipient, uint256 amount);
    event Withdrawn(address indexed recipient, uint256 amount);

    constructor(address usdc_, address initialOwner, uint256 feeBps, address feeRecipient_) Ownable(initialOwner) {
        require(usdc_ != address(0), "RideEscrow: zero USDC address");
        require(feeRecipient_ != address(0), "RideEscrow: zero fee recipient");
        require(feeBps <= 500, "RideEscrow: fee too high");

        usdc = IERC20(usdc_);
        platformFeeBps = feeBps;
        feeRecipient = feeRecipient_;
    }

    /**
     * @notice Books a seat on an active ride and escrows the fare in USDC.
     * @param rideId The ride id to book.
     */
    function bookSeat(uint256 rideId) external {
        IRouteRegistry.Ride memory ride = routeRegistry.getRide(rideId);

        require(ride.active, "RideEscrow: ride is not active");
        require(ride.availableSeats > 0, "RideEscrow: no seats available");
        require(ride.departureTime > block.timestamp, "RideEscrow: ride already departed");

        routeRegistry.decrementAvailableSeats(rideId);

        uint256 amount = ride.pricePerSeat;
        uint256 bookingId = nextBookingId;
        nextBookingId = bookingId + 1;

        bookings[bookingId] = Booking({
            id: bookingId,
            rideId: rideId,
            passenger: msg.sender,
            driver: ride.driver,
            departureTime: ride.departureTime,
            amountEscrowed: amount,
            status: BookingStatus.Active
        });

        emit SeatBooked(bookingId, rideId, msg.sender, amount);

        require(usdc.transferFrom(msg.sender, address(this), amount), "RideEscrow: transferFrom failed");
    }

    /**
     * @notice Completes an active booking and releases escrowed payment.
     * @param bookingId The booking id to complete.
     */
    function completeRide(uint256 bookingId) external {
        Booking storage booking = bookings[bookingId];
        require(booking.status == BookingStatus.Active, "RideEscrow: booking not active");

        require(msg.sender == booking.driver, "RideEscrow: caller is not driver");
        require(block.timestamp >= booking.departureTime, "RideEscrow: ride not departed");

        booking.status = BookingStatus.Completed;

        uint256 fee = (booking.amountEscrowed * platformFeeBps) / 10_000;
        uint256 driverAmount = booking.amountEscrowed - fee;

        if (fee > 0) {
            pendingWithdrawals[feeRecipient] += fee;
            emit WithdrawalPending(feeRecipient, fee);
        }
        pendingWithdrawals[booking.driver] += driverAmount;
        emit WithdrawalPending(booking.driver, driverAmount);

        emit RideCompleted(bookingId, booking.driver, driverAmount, fee);
    }

    /**
     * @notice Cancels an active booking by passenger and settles refund/payout.
     * @param bookingId The booking id to cancel.
     */
    function cancelBookingByPassenger(uint256 bookingId) external {
        Booking storage booking = bookings[bookingId];
        require(booking.passenger == msg.sender, "RideEscrow: caller is not passenger");
        require(booking.status == BookingStatus.Active, "RideEscrow: booking not active");

        require(block.timestamp < booking.departureTime, "RideEscrow: ride already departed");

        booking.status = BookingStatus.CancelledByPassenger;
        routeRegistry.incrementAvailableSeats(booking.rideId);

        uint256 refundAmount;

        if (booking.departureTime > block.timestamp + CANCELLATION_WINDOW) {
            refundAmount = booking.amountEscrowed;
            pendingWithdrawals[booking.passenger] += refundAmount;
            emit WithdrawalPending(booking.passenger, refundAmount);
        } else {
            uint256 halfAmount = booking.amountEscrowed / 2;
            refundAmount = halfAmount;
            uint256 driverAmount = booking.amountEscrowed - halfAmount;

            pendingWithdrawals[booking.passenger] += refundAmount;
            emit WithdrawalPending(booking.passenger, refundAmount);
            pendingWithdrawals[booking.driver] += driverAmount;
            emit WithdrawalPending(booking.driver, driverAmount);
        }

        emit BookingCancelled(bookingId, BookingStatus.CancelledByPassenger, refundAmount);
    }

    /**
     * @notice Claims full refund for an active booking if driver has not settled 48 hours after departure.
     * @param bookingId The booking id to refund.
     */
    function claimRefundAfterTimeout(uint256 bookingId) external {
        Booking storage booking = bookings[bookingId];
        require(booking.passenger == msg.sender, "RideEscrow: caller is not passenger");
        require(booking.status == BookingStatus.Active, "RideEscrow: booking not active");

        require(block.timestamp >= booking.departureTime + 48 hours, "RideEscrow: refund timeout not reached");

        booking.status = BookingStatus.CancelledByPassenger;
        routeRegistry.incrementAvailableSeats(booking.rideId);

        uint256 refundAmount = booking.amountEscrowed;
        pendingWithdrawals[booking.passenger] += refundAmount;
        emit WithdrawalPending(booking.passenger, refundAmount);

        emit BookingCancelled(bookingId, BookingStatus.CancelledByPassenger, refundAmount);
    }

    /**
     * @notice Cancels an active booking by driver and refunds passenger in full.
     * @param bookingId The booking id to cancel.
     */
    function cancelBookingByDriver(uint256 bookingId) external {
        Booking storage booking = bookings[bookingId];
        require(booking.status == BookingStatus.Active, "RideEscrow: booking not active");

        require(msg.sender == booking.driver, "RideEscrow: caller is not driver");
        require(block.timestamp < booking.departureTime, "RideEscrow: cannot cancel after departure");

        booking.status = BookingStatus.CancelledByDriver;
        routeRegistry.incrementAvailableSeats(booking.rideId);

        uint256 refundAmount = booking.amountEscrowed;
        pendingWithdrawals[booking.passenger] += refundAmount;
        emit WithdrawalPending(booking.passenger, refundAmount);

        emit BookingCancelled(bookingId, BookingStatus.CancelledByDriver, refundAmount);
    }

    function withdraw() external {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "RideEscrow: nothing to withdraw");
        pendingWithdrawals[msg.sender] = 0;
        require(usdc.transfer(msg.sender, amount), "RideEscrow: transfer failed");
        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @notice Returns booking details.
     * @param bookingId The booking id to query.
     * @return The booking data.
     */
    function getBooking(uint256 bookingId) external view returns (Booking memory) {
        return bookings[bookingId];
    }

    /**
     * @notice Sets the RouteRegistry contract used for ride and seat management.
     * @param registry RouteRegistry contract address.
     */
    function setRouteRegistry(address registry) external onlyOwner {
        require(registry != address(0), "RideEscrow: zero registry address");
        address oldRegistry = address(routeRegistry);
        routeRegistry = IRouteRegistry(registry);
        emit RouteRegistryUpdated(oldRegistry, registry);
    }

    /**
     * @notice Sets the platform fee in basis points.
     * @param feeBps New fee in basis points (max 500).
     */
    function setPlatformFee(uint256 feeBps) external onlyOwner {
        require(feeBps <= 500, "RideEscrow: fee too high");
        uint256 oldFeeBps = platformFeeBps;
        platformFeeBps = feeBps;
        emit PlatformFeeUpdated(oldFeeBps, feeBps);
    }

    /**
     * @notice Sets the fee recipient address.
     * @param recipient New fee recipient.
     */
    function setFeeRecipient(address recipient) external onlyOwner {
        require(recipient != address(0), "RideEscrow: zero fee recipient");
        address oldRecipient = feeRecipient;
        feeRecipient = recipient;
        emit FeeRecipientUpdated(oldRecipient, recipient);
    }
}
