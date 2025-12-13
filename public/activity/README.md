# Activity Screenshots Directory

This directory stores screenshots captured by the Talio desktop application.

## Structure

```
activity/
├── {userId}/
│   ├── {YYYY-MM-DD}/
│   │   ├── {timestamp}.webp
│   │   └── ...
│   └── ...
└── ...
```

## Notes

- Screenshots are only captured when users are clocked in
- Images are compressed WebP format for optimal storage
- Each screenshot is named with ISO timestamp (e.g., `2024-12-13T10-30-45-123Z.webp`)
- Screenshots are linked to users via their userId in the path

## Storage Considerations

Consider implementing periodic cleanup of old screenshots to manage storage space.
