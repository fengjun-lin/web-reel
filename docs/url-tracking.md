# URL Tracking in Web Reel

Web Reel automatically tracks URL changes during recording sessions, including:

- Initial page URL
- SPA navigation (pushState/replaceState)
- Browser back/forward (popstate)
- Hash changes (#)

## How It Works

The recorder uses a `URLInterceptor` that:

1. **Records the initial URL** when recording starts
2. **Intercepts History API** - Monitors `pushState` and `replaceState` calls
3. **Listens to navigation events** - Captures `popstate` and `hashchange` events
4. **Stores URL changes as custom events** - Integrated into the rrweb timeline

## Data Format

URL changes are stored as custom events in the rrweb event stream:

```json
{
  "type": 5,
  "data": {
    "tag": "url-change",
    "payload": {
      "url": "https://example.com/page",
      "trigger": "pushState",
      "timestamp": 1234567890
    }
  },
  "timestamp": 1234567890
}
```

### Trigger Types

| Trigger        | Description                                     |
| -------------- | ----------------------------------------------- |
| `initial`      | Page load or recording start                    |
| `pushState`    | History.pushState() called (SPA navigation)     |
| `replaceState` | History.replaceState() called (URL replacement) |
| `popstate`     | Browser back/forward button                     |
| `hashchange`   | Hash fragment changed                           |

## Viewing URL Changes

### During Recording

URL changes are logged to the console during recording:

```
[Web-Reel] URL changed (initial): https://example.com/
[Web-Reel] URL changed (pushState): https://example.com/products
[Web-Reel] URL changed (popstate): https://example.com/
```

### During Replay

When replaying a session, URL changes are visible in:

1. **Player Header** - Shows the current URL in real-time as the session plays
   - Displays directly under the "Session Player" title
   - Updates automatically during playback
   - Shows the URL that was active at the current playback time

2. **Console Panel** (Optional) - Can also be seen in logs if needed
3. **Event Timeline** - Custom events appear in the rrweb player

Example in replay:

```
Session Player
🔗 URL: https://example.com/products
[Player interface shows here]
```

## Customization

### Disable URL Tracking

If you want to disable URL tracking (not recommended):

```typescript
const recorder = new WebReelRecorder({
  // ... other config
});

// Manually stop URL interceptor after init
setTimeout(() => {
  recorder.stop(); // This stops all interceptors
  // Or access the URL interceptor directly if exposed
}, 0);
```

### Custom URL Handler

For advanced use cases, you can create your own URL interceptor:

```typescript
import { URLInterceptor } from '@web-reel/recorder';

const urlInterceptor = new URLInterceptor({
  onURLChange: (url, trigger) => {
    console.log(`URL changed: ${url} (${trigger})`);

    // Custom logic here
    // e.g., send to analytics, filter sensitive URLs, etc.
  },
});

urlInterceptor.install();

// Later...
urlInterceptor.uninstall();
```

## Privacy Considerations

URL tracking may capture sensitive information in URLs:

1. **Query parameters** - May contain tokens, IDs, or PII
2. **Hash fragments** - May contain client-side routing data
3. **Path segments** - May reveal user actions or identities

### Filtering Sensitive URLs

Consider implementing URL sanitization:

```typescript
function sanitizeURL(url: string): string {
  const urlObj = new URL(url);

  // Remove sensitive query parameters
  urlObj.searchParams.delete('token');
  urlObj.searchParams.delete('api_key');
  urlObj.searchParams.delete('session_id');

  // Mask user IDs in path
  const path = urlObj.pathname.replace(/\/users\/\d+/, '/users/[ID]');
  urlObj.pathname = path;

  return urlObj.toString();
}
```

## Use Cases

### Debugging SPA Navigation

Track which routes trigger errors or performance issues:

```typescript
// In your error handler
window.addEventListener('error', (event) => {
  console.log('Error occurred at URL:', window.location.href);
  // Error is automatically captured by Web Reel with URL context
});
```

### Funnel Analysis

Analyze user navigation patterns:

```typescript
// URLs are automatically recorded
// Analyze exported session data to see:
// - Entry page
// - Navigation flow
// - Exit page
// - Time spent on each page
```

### Session Replay Context

When replaying sessions, URL changes provide crucial context:

- Which page was the user on when an error occurred?
- Did they navigate away and come back?
- What was the sequence of pages visited?

## Technical Details

### Implementation

The URL interceptor is initialized after rrweb recording starts:

```typescript
// In WebReelRecorder.setup()
1. Initialize rrweb recording
2. Initialize URL interceptor
3. URL changes are recorded as custom events
```

### Event Storage

URL change events are stored in the same IndexedDB table as rrweb events:

- Table: `renderEvent`
- Type: `5` (Custom Event)
- Tag: `url-change`

### Browser Support

URL tracking works in all browsers that support:

- History API (IE 10+)
- Hashchange event (IE 8+)
- Modern browsers (Chrome, Firefox, Safari, Edge)

## Troubleshooting

### URL Changes Not Recorded

**Problem**: URL changes don't appear in recordings

**Solutions**:

1. Check console for `[Web-Reel] URL interceptor initialized`
2. Verify rrweb recording is active
3. Check if custom events are being saved to IndexedDB

### Duplicate URL Events

**Problem**: Same URL recorded multiple times

**Explanation**: This is normal for:

- `pushState` to the same URL
- `replaceState` with same URL
- Hash changes that don't change the path

### Performance Impact

URL tracking has minimal performance impact:

- **Memory**: <1KB per URL change event
- **CPU**: <1ms per URL change
- **No network requests**

## Best Practices

1. **Always include URL context** when analyzing bugs
2. **Sanitize sensitive URLs** before uploading
3. **Use URL patterns** to identify problematic routes
4. **Correlate URL changes** with errors and network requests
5. **Review URL tracking** in privacy policy if recording user sessions

## Related Documentation

- [Session API](./session-api.md)
- [Network Monitoring](./network-monitoring.md)
- [Privacy & Security](../memory-bank/privacySecurity.md)
