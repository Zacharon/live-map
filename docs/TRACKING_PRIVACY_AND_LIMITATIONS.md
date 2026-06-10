# Tracking Privacy And Limitations

## Aviation

- Coverage is receiver-dependent.
- Positions may be missing or delayed.
- Some aircraft may not be visible.
- Transponder data is not independently authenticated.
- Owner identity is not provided.
- Destination is not inferred.

## Maritime

- AIS may be delayed, missing, false, or disabled.
- Terrestrial AIS has coastal coverage limits.
- Satellite data may be delayed or restricted.
- Destination and ETA may be self-reported.
- Vessel presence is not proof of cargo or illegal conduct.

The public UI should use plain-language statuses such as "Flight tracking is not configured", "Aircraft data is temporarily delayed", and "Showing cached vessel activity".
