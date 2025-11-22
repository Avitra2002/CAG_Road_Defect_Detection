
import xml.etree.ElementTree as ET
from datetime import datetime
from typing import Optional


def parse_gpx(gpx_content: str) -> list[dict]:
    
    root = ET.fromstring(gpx_content)

    namespaces = {
        'gpx': 'http://www.topografix.com/GPX/1/1',
        'gpx10': 'http://www.topografix.com/GPX/1/0'
    }

    coordinates = []

    track_points = root.findall('.//gpx:trkpt', namespaces)
    if not track_points:
        track_points = root.findall('.//gpx10:trkpt', namespaces)

    if not track_points:
        track_points = root.findall('.//{http://www.topografix.com/GPX/1/1}trkpt')

    if not track_points:
        track_points = root.findall('.//trkpt')

    for point in track_points:
        lat = float(point.get('lat'))
        lng = float(point.get('lon'))

        # Extract elevation if available
        elevation = None
        ele_elem = point.find('gpx:ele', namespaces) or point.find('ele') or point.find('{http://www.topografix.com/GPX/1/1}ele')
        if ele_elem is not None and ele_elem.text:
            elevation = float(ele_elem.text)

        # Extract timestamp
        timestamp = None
        time_elem = point.find('gpx:time', namespaces) or point.find('time') or point.find('{http://www.topografix.com/GPX/1/1}time')
        if time_elem is not None and time_elem.text:
            
            time_str = time_elem.text
            
            if time_str.endswith('Z'):
                time_str = time_str[:-1] + '+00:00'
            try:
                timestamp = datetime.fromisoformat(time_str)
            except ValueError:
                # Try parsing without timezone
                timestamp = datetime.strptime(time_str.split('.')[0], '%Y-%m-%dT%H:%M:%S')

        coordinates.append({
            'lat': lat,
            'lng': lng,
            'elevation': elevation,
            'timestamp': timestamp
        })

    return coordinates


def get_gps_at_time(coordinates: list[dict], target_time: datetime) -> Optional[dict]:
    
    if not coordinates:
        return None

    # Filter coordinates with timestamps
    timed_coords = [c for c in coordinates if c['timestamp'] is not None]

    if not timed_coords:
        # If no timestamps, return first coordinate
        return {'lat': coordinates[0]['lat'], 'lng': coordinates[0]['lng']}

   
    timed_coords.sort(key=lambda x: x['timestamp'])

    # Find surrounding points
    before = None
    after = None

    for i, coord in enumerate(timed_coords):
        if coord['timestamp'] <= target_time:
            before = coord
        if coord['timestamp'] >= target_time and after is None:
            after = coord
            break

    # target is before all points, return first
    if before is None:
        return {'lat': timed_coords[0]['lat'], 'lng': timed_coords[0]['lng']}

    # target is after all points, return last
    if after is None:
        return {'lat': timed_coords[-1]['lat'], 'lng': timed_coords[-1]['lng']}

    # exact match
    if before['timestamp'] == after['timestamp']:
        return {'lat': before['lat'], 'lng': before['lng']}

    # interpolation
    total_time = (after['timestamp'] - before['timestamp']).total_seconds()
    elapsed_time = (target_time - before['timestamp']).total_seconds()
    ratio = elapsed_time / total_time if total_time > 0 else 0

    lat = before['lat'] + (after['lat'] - before['lat']) * ratio
    lng = before['lng'] + (after['lng'] - before['lng']) * ratio

    return {'lat': lat, 'lng': lng}


def get_gps_at_frame(coordinates: list[dict], frame_number: int, fps: float, video_start_time: Optional[datetime] = None) -> Optional[dict]:
    
    if not coordinates:
        return None

    time_offset_seconds = frame_number / fps

    # start time
    if video_start_time is None:
        # first GPS timestamp
        timed_coords = [c for c in coordinates if c['timestamp'] is not None]
        if timed_coords:
            video_start_time = timed_coords[0]['timestamp']
        else:
            # no timestamps, interpolate by index
            if len(coordinates) == 1:
                return {'lat': coordinates[0]['lat'], 'lng': coordinates[0]['lng']}


            ratio = frame_number / (fps * 60)  #  1 minute default
            idx = min(int(ratio * len(coordinates)), len(coordinates) - 1)
            return {'lat': coordinates[idx]['lat'], 'lng': coordinates[idx]['lng']}

    # target time
    from datetime import timedelta
    target_time = video_start_time + timedelta(seconds=time_offset_seconds)

    return get_gps_at_time(coordinates, target_time)
