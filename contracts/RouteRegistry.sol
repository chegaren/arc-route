// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract RouteRegistry is Ownable {
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

    uint256 public nextRideId;
    mapping(uint256 => Ride) public rides;
    mapping(address => uint256[]) public driverRides;

    address public escrowContract;

    event RidePublished(
        uint256 rideId,
        address driver,
        string origin,
        string destination,
        uint256 departureTime,
        uint8 totalSeats,
        uint256 pricePerSeat
    );
    event RideCancelled(uint256 rideId);
    event SeatsUpdated(uint256 rideId, uint8 availableSeats);
    event EscrowContractUpdated(address indexed oldEscrow, address indexed newEscrow);

    modifier onlyEscrow() {
        require(msg.sender == escrowContract, "RouteRegistry: unauthorized escrow caller");
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @notice Publishes a new ride.
     * @param origin Ride origin location.
     * @param destination Ride destination location.
     * @param departureTime Unix timestamp when the ride departs.
     * @param totalSeats Total seats offered for this ride (1-8).
     * @param pricePerSeat Price per seat in USDC smallest unit (6 decimals).
     * @return rideId The id of the newly created ride.
     */
    function publishRide(
        string calldata origin,
        string calldata destination,
        uint256 departureTime,
        uint8 totalSeats,
        uint256 pricePerSeat
    ) external returns (uint256 rideId) {
        require(departureTime > block.timestamp, "RouteRegistry: departure must be in future");
        require(totalSeats >= 1 && totalSeats <= 8, "RouteRegistry: invalid seat count");
        require(pricePerSeat > 0, "RouteRegistry: invalid price");

        rideId = nextRideId;
        nextRideId = rideId + 1;

        rides[rideId] = Ride({
            id: rideId,
            driver: msg.sender,
            origin: origin,
            destination: destination,
            departureTime: departureTime,
            totalSeats: totalSeats,
            availableSeats: totalSeats,
            pricePerSeat: pricePerSeat,
            active: true
        });

        driverRides[msg.sender].push(rideId);

        emit RidePublished(rideId, msg.sender, origin, destination, departureTime, totalSeats, pricePerSeat);
    }

    /**
     * @notice Cancels an active ride that has no bookings.
     * @param rideId The ride id to cancel.
     */
    function cancelRide(uint256 rideId) external {
        Ride storage ride = rides[rideId];

        require(ride.driver == msg.sender, "RouteRegistry: caller is not driver");
        require(ride.active, "RouteRegistry: ride is not active");
        require(ride.availableSeats == ride.totalSeats, "RouteRegistry: ride has bookings");

        ride.active = false;

        emit RideCancelled(rideId);
    }

    /**
     * @notice Decreases available seat count by one for a ride.
     * @dev Callable only by the authorized RideEscrow contract.
     * @param rideId The ride id to update.
     */
    function decrementAvailableSeats(uint256 rideId) external onlyEscrow {
        Ride storage ride = rides[rideId];

        require(ride.active, "RouteRegistry: ride is not active");
        require(ride.availableSeats > 0, "RouteRegistry: no seats available");

        unchecked {
            ride.availableSeats -= 1;
        }

        emit SeatsUpdated(rideId, ride.availableSeats);
    }

    /**
     * @notice Increases available seat count by one for a ride.
     * @dev Callable only by the authorized RideEscrow contract.
     * @param rideId The ride id to update.
     */
    function incrementAvailableSeats(uint256 rideId) external onlyEscrow {
        Ride storage ride = rides[rideId];

        require(ride.active, "RouteRegistry: ride is not active");
        require(ride.availableSeats < ride.totalSeats, "RouteRegistry: seats already full");

        unchecked {
            ride.availableSeats += 1;
        }

        emit SeatsUpdated(rideId, ride.availableSeats);
    }

    /**
     * @notice Returns ride details.
     * @param rideId The ride id to query.
     * @return The ride data.
     */
    function getRide(uint256 rideId) external view returns (Ride memory) {
        return rides[rideId];
    }

    /**
     * @notice Returns all ride ids published by a driver.
     * @param driver The driver address.
     * @return List of ride ids for the driver.
     */
    function getDriverRides(address driver) external view returns (uint256[] memory) {
        return driverRides[driver];
    }

    /**
     * @notice Sets the RideEscrow contract authorized to update seat counts.
     * @param escrow The RideEscrow contract address.
     */
    function setEscrowContract(address escrow) external onlyOwner {
        require(escrow != address(0), "RouteRegistry: zero escrow address");
        address oldEscrow = escrowContract;
        escrowContract = escrow;
        emit EscrowContractUpdated(oldEscrow, escrow);
    }
}
