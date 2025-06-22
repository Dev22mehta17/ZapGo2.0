// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Booking {
    struct BookingData {
        uint256 id;
        string user;
        string station;
        uint256 startTime;
        uint256 endTime;
    }

    mapping(uint256 => BookingData) public bookings;
    uint256 public nextBookingId;

    event BookingCreated(
        uint256 id,
        string user,
        string station,
        uint256 startTime,
        uint256 endTime
    );

    function addBooking(
        string memory _user,
        string memory _station,
        uint256 _startTime,
        uint256 _endTime
    ) public returns (uint256) {
        uint256 id = nextBookingId++;
        bookings[id] = BookingData(
            id,
            _user,
            _station,
            _startTime,
            _endTime
        );
        emit BookingCreated(id, _user, _station, _startTime, _endTime);
        return id;
    }
} 