"""
Data source abstraction for RailPulse ETA.

This module defines the interface between the application and railway data sources.
For the SIH prototype, MockRailwayDataSource provides simulated data.
In production, RealRailwayDataSource would consume actual GPS/AVL feeds and railway APIs.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import random
from datetime import datetime, timezone


class DataSource(ABC):
    """
    Abstract data source interface.

    This abstraction allows the application to switch between simulated data
    (for development and demonstration) and real railway data feeds (for production).

    Future integration points:
    - GPS/AVL feeds from Indian Railways
    - NTES or authorized railway data sources
    - Signal system data
    - Weather APIs (IMD, OpenWeatherMap)
    - Track maintenance schedules
    - Congestion data from railway control rooms
    """

    @abstractmethod
    async def get_train_position(self, train_id: str) -> Optional[Dict[str, Any]]:
        """Get current GPS position of a train."""
        pass

    @abstractmethod
    async def get_weather(self, latitude: float, longitude: float) -> Dict[str, Any]:
        """Get weather conditions at a location."""
        pass

    @abstractmethod
    async def get_congestion(self, section_id: str) -> Dict[str, Any]:
        """Get congestion level for a track section."""
        pass

    @abstractmethod
    async def get_signal_status(self, section_id: str) -> Dict[str, Any]:
        """Get signal status for a track section."""
        pass


class MockRailwayDataSource(DataSource):
    """
    Simulated railway data source for SIH prototype.

    For SIH prototype, simulated data is used because Indian Railways
    operational APIs are not publicly available to the development team.

    This class generates realistic but synthetic data that mimics:
    - GPS-based train location updates
    - Weather conditions along railway routes
    - Network congestion levels
    - Signal system states
    """

    async def get_train_position(self, train_id: str) -> Optional[Dict[str, Any]]:
        """Generate simulated GPS position."""
        return {
            "train_id": train_id,
            "latitude": 22.0 + random.uniform(-5, 10),
            "longitude": 77.0 + random.uniform(-5, 8),
            "speed_kmph": random.uniform(30, 120),
            "heading": random.uniform(0, 360),
            "accuracy_meters": random.uniform(5, 50),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source": "simulated_gps",
        }

    async def get_weather(self, latitude: float, longitude: float) -> Dict[str, Any]:
        """Generate simulated weather data."""
        conditions = ["Clear", "Cloudy", "Light Rain", "Heavy Rain", "Fog", "Haze"]
        condition = random.choice(conditions)

        severity_map = {
            "Clear": 0.0, "Cloudy": 0.1, "Haze": 0.2,
            "Light Rain": 0.3, "Heavy Rain": 0.7, "Fog": 0.6,
        }

        return {
            "condition": condition,
            "severity": severity_map.get(condition, 0.1),
            "temperature_c": random.uniform(15, 42),
            "humidity_percent": random.uniform(30, 95),
            "visibility_km": random.uniform(0.5, 10),
            "wind_speed_kmph": random.uniform(0, 40),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source": "simulated_weather",
        }

    async def get_congestion(self, section_id: str) -> Dict[str, Any]:
        """Generate simulated congestion data."""
        score = random.uniform(0, 1)
        if score < 0.3:
            status = "Normal"
        elif score < 0.6:
            status = "Moderate"
        elif score < 0.8:
            status = "High"
        else:
            status = "Critical"

        return {
            "section_id": section_id,
            "congestion_score": round(score, 3),
            "status": status,
            "active_trains": random.randint(0, 5),
            "avg_speed_kmph": round(100 * (1 - score * 0.6), 1),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source": "simulated_congestion",
        }

    async def get_signal_status(self, section_id: str) -> Dict[str, Any]:
        """Generate simulated signal status."""
        aspects = ["Green", "Double Yellow", "Yellow", "Red"]
        weights = [0.5, 0.25, 0.15, 0.1]
        aspect = random.choices(aspects, weights=weights, k=1)[0]

        return {
            "section_id": section_id,
            "aspect": aspect,
            "clear": aspect == "Green",
            "speed_limit_kmph": {
                "Green": 130, "Double Yellow": 80, "Yellow": 40, "Red": 0
            }.get(aspect, 80),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source": "simulated_signal",
        }


class RealRailwayDataSource(DataSource):
    """
    Real railway data source for production deployment.

    This is a stub/interface for future integration with actual Indian Railways data feeds.

    Potential data sources:
    - CRIS (Centre for Railway Information Systems) APIs
    - GPS/AVL (Automatic Vehicle Location) feeds
    - NTES (National Train Enquiry System) data
    - RailTel network data
    - Signal system integration via railway control rooms
    - IMD (India Meteorological Department) weather APIs
    - Track maintenance schedules from engineering department

    Note: Access to these data sources requires authorization from Indian Railways
    and is not available for this SIH prototype.
    """

    async def get_train_position(self, train_id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError(
            "Real railway data source not implemented. "
            "This requires integration with Indian Railways GPS/AVL feeds. "
            "Contact CRIS or authorized railway data providers for API access."
        )

    async def get_weather(self, latitude: float, longitude: float) -> Dict[str, Any]:
        raise NotImplementedError(
            "Real weather data source not implemented. "
            "This can be integrated with IMD or OpenWeatherMap APIs."
        )

    async def get_congestion(self, section_id: str) -> Dict[str, Any]:
        raise NotImplementedError(
            "Real congestion data source not implemented. "
            "This requires integration with railway control room systems."
        )

    async def get_signal_status(self, section_id: str) -> Dict[str, Any]:
        raise NotImplementedError(
            "Real signal data source not implemented. "
            "This requires integration with railway signalling systems."
        )
