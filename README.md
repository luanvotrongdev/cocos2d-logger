~~~{"id":"55901","variant":"standard","title":"README for cocos2d-logger"}
# cocos2d-logger

A lightweight, zero-friction on-screen logger for Cocos Creator. Designed to accelerate in-engine debugging without attaching devtools or printing to native consoles. Ideal for rapid iteration, mobile debugging, and field-test builds where console access is constrained.

## Key Value Props
- **Real-time log surface** directly in the game view  
- **Non-blocking overlay** with configurable anchor, opacity, and font size  
- **Drop-in integration**—minimal footprint, no external dependencies  
- **Production-safe**—easy runtime toggle and optional filtering  
- **Mobile-friendly UX**—touch scroll, pinch to zoom (optional)

## Installation
1. Add the package folder into your project’s `assets/` directory.  
2. Ensure TypeScript is enabled if using `.ts` components.  
3. Reload the Cocos Creator editor.

## Usage

### Initialization
```ts
import { Logger } from './scripts/Logger';

const logger = new Logger({
  maxLines: 200,
  fontSize: 14,
  anchor: 'bottom-left',
});
```

### Logging
```ts
logger.info('Game started');
logger.warn('Low FPS detected');
logger.error('Player position invalid', player.position);
```

### Toggle Visibility
```ts
logger.setVisible(true);  // show
logger.setVisible(false); // hide
```

### Clear Logs
```ts
logger.clear();
```

## Configuration Options
| Option      | Type      | Default        | Description |
|-------------|-----------|----------------|-------------|
| `maxLines`  | number    | 100            | Max log buffer size |
| `fontSize`  | number    | 12             | Text size |
| `anchor`    | string    | 'top-left'     | UI anchor: top-left, top-right, bottom-left, bottom-right |
| `opacity`   | number    | 0.8            | Background opacity |
| `timestamp` | boolean   | true           | Prepend timestamps |

## Best Practices
- Disable or minimize logs in production to avoid perf overhead.  
- Use `logger.warn` and `logger.error` strategically for telemetry-style insights during QA.  
- Keep `maxLines` lean on low-end mobile devices.

## Roadmap
- Log filtering (INFO/WARN/ERROR)  
- Remote streaming via WebSocket  
- UI skinning presets  
- Auto-collapse when idle

## License
MIT License.
~~~
