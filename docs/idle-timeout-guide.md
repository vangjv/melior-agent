# Idle Timeout User Guide

**Version**: 1.0  
**Last Updated**: October 27, 2025  
**Feature**: Auto-Disconnect on Idle Activity

---

## Overview

The Idle Timeout feature automatically disconnects your voice chat session when no activity is detected for a configurable period of time. This helps manage resources efficiently and ensures sessions don't remain connected indefinitely when you step away.

---

## What is Considered "Activity"?

The system monitors two types of activity to determine if a session is idle:

1. **Transcriptions**: When you speak and your voice is transcribed
2. **Chat Messages**: When you or the AI agent sends a message in the conversation

Any of these actions will reset the idle timer back to the full duration.

---

## Default Behavior

By default, the idle timeout feature is configured as follows:

- **Timeout Duration**: 2 minutes (120 seconds)
- **Warning Threshold**: 30 seconds before timeout
- **Status**: Enabled

This means:
- If no activity occurs for 2 minutes, your session will automatically disconnect
- You'll see a warning banner 30 seconds before the disconnect happens
- You can dismiss the warning to indicate activity and reset the timer

---

## The Warning Banner

When 30 seconds (or your configured warning threshold) remain before timeout, you'll see a warning banner at the top of the screen:

- **Display**: Shows a countdown timer (e.g., "00:30")
- **Message**: "Your session will disconnect in {time} due to inactivity"
- **Action**: Click the "Dismiss" button to reset the timer and keep your session active
- **Accessibility**: The warning has proper ARIA attributes for screen readers

The warning banner will:
- Appear automatically when the threshold is reached
- Update every second with the remaining time
- Disappear if you perform any activity (speak, send a message, or dismiss it)

---

## Configuring the Idle Timeout

You can customize the idle timeout behavior to suit your needs using the **Idle Timeout Settings** panel.

### Accessing Settings

1. Navigate to the Settings section of the application
2. Find the "Idle Timeout Settings" card

### Available Configuration Options

#### 1. Enable/Disable Auto-Disconnect

Use the toggle switch to turn the idle timeout feature on or off:
- **ON**: Sessions will auto-disconnect after the configured timeout period
- **OFF**: Sessions will remain connected indefinitely (no automatic disconnection)

#### 2. Timeout Duration

Set how long the system waits before disconnecting an idle session:

- **Range**: 1 to 60 minutes (30 seconds to 3600 seconds)
- **Default**: 2 minutes
- **Increment**: 1 minute
- **Display**: Shows the duration in a human-readable format (e.g., "5 minutes", "1h 30m")

**Examples**:
- Short timeout (1 minute): For quick sessions where you need rapid disconnect
- Medium timeout (5 minutes): Standard usage with reasonable idle tolerance
- Long timeout (30 minutes): For sessions where you may step away briefly

#### 3. Warning Threshold

Configure when the warning banner appears before timeout:

- **Range**: 5 seconds to just under the timeout duration
- **Default**: 30 seconds
- **Increment**: 5 seconds
- **Display**: Shows when the warning will appear (e.g., "Show warning 30 seconds before disconnect")

**Important**: The warning threshold must be less than the timeout duration. For example, if your timeout is 2 minutes (120 seconds), the warning threshold must be less than 120 seconds.

### Saving Your Configuration

1. Adjust the settings to your preference
2. Click the **"Save Settings"** button
3. You'll see a confirmation message: "Settings saved successfully!"
4. Your preferences are saved to your browser's session storage

### Resetting to Defaults

If you want to restore the original settings:

1. Click the **"Reset to Defaults"** button
2. All settings will return to:
   - Enabled: Yes
   - Duration: 2 minutes
   - Warning: 30 seconds

---

## How the Timer Works

### Session Start

When you connect to a voice chat session:
1. The idle timer starts automatically
2. The countdown begins from your configured duration
3. The timer runs in the background

### Activity Detection

When activity occurs (transcription or chat message):
1. The timer immediately resets to the full duration
2. The countdown starts over from the beginning
3. If a warning was showing, it disappears

### Warning Phase

When time remaining ≤ warning threshold:
1. The warning banner appears at the top of the screen
2. The countdown updates every second
3. You can dismiss the warning to reset the timer

### Timeout

When the timer reaches zero:
1. The session automatically disconnects
2. The LiveKit connection is terminated
3. The conversation history remains accessible
4. You can reconnect at any time

### Manual Disconnect

If you manually disconnect:
1. The idle timer stops immediately
2. All timer state is reset
3. No automatic disconnect occurs

---

## Persistence

Your idle timeout configuration is saved in your browser's **session storage**:

- **Scope**: Per browser tab
- **Duration**: Until the tab is closed
- **Data**: Timeout duration, warning threshold, enabled status

This means:
- Each browser tab has its own configuration
- Settings persist when you refresh the page
- Settings are lost when you close the tab
- Different tabs can have different configurations

---

## Accessibility Features

The idle timeout feature is designed with accessibility in mind:

### Warning Banner
- **Role**: `alert` with `aria-live="assertive"`
- **Screen Readers**: Announces the warning immediately when it appears
- **Keyboard Navigation**: Dismiss button is keyboard accessible (Tab + Enter/Space)
- **Color Contrast**: Meets WCAG 2.1 AA standards

### Settings Panel
- **Labels**: All form inputs have clear, descriptive labels
- **ARIA Attributes**: Proper `aria-label` attributes on all controls
- **Validation Messages**: Error messages are announced to screen readers
- **Keyboard Support**: Full keyboard navigation and control

---

## Best Practices

### For Regular Use
- **Default settings** (2 minutes) work well for most users
- **Dismiss the warning** if you're still actively using the session but haven't spoken recently
- **Manually disconnect** when you're done to avoid waiting for the timeout

### For Long Sessions
- **Increase the timeout** to 10-15 minutes if you frequently pause during conversations
- **Keep warning threshold** at 30 seconds for adequate notice

### For Quick Sessions
- **Decrease the timeout** to 1-2 minutes for rapid turnaround
- **Lower warning threshold** to 15 seconds if you want minimal interruption

### For Presentations or Demos
- **Disable the timeout** temporarily to avoid unexpected disconnections
- **Re-enable** after your presentation is complete

---

## Troubleshooting

### "My session disconnects too quickly"
- Increase the timeout duration in settings
- Ensure your microphone is working (voice activity resets the timer)
- Check that the feature is enabled

### "I don't see the warning banner"
- Verify the warning threshold is less than the timeout duration
- Check that the timeout feature is enabled
- Ensure you're not dismissing it automatically by speaking

### "My settings aren't saving"
- Check browser console for errors
- Ensure session storage is enabled in your browser
- Try resetting to defaults and reconfiguring

### "The timer doesn't reset when I speak"
- Verify transcriptions are appearing in the conversation
- Check the ConversationStorageService is working properly
- Look for errors in the browser console

---

## Technical Details

For developers and advanced users:

- **Timer Accuracy**: ±1 second (updates every 1000ms)
- **Storage Key**: `melior-agent:idle-timeout-config`
- **State Management**: Angular Signals for reactive updates
- **Timer Implementation**: RxJS `interval()` operator
- **Activity Monitoring**: `ConversationStorageService.lastMessageAt` signal

---

## Frequently Asked Questions

**Q: Does the timer continue if I switch browser tabs?**  
A: Yes, the timer continues running even if the tab is not visible.

**Q: Can I have different settings in different tabs?**  
A: Yes, each browser tab maintains its own configuration in session storage.

**Q: What happens to my conversation history when I timeout?**  
A: Your conversation history is preserved and remains accessible. Only the LiveKit connection is terminated.

**Q: Can I disable the feature completely?**  
A: Yes, use the toggle switch in the Idle Timeout Settings panel to disable auto-disconnect.

**Q: Is there a maximum timeout duration?**  
A: Yes, the maximum is 60 minutes (3600 seconds).

**Q: Is there a minimum timeout duration?**  
A: Yes, the minimum is 30 seconds. This prevents accidental immediate disconnections.

---

## Related Features

- **Voice Chat**: Core voice communication feature that idle timeout monitors
- **Conversation History**: Persists across timeout disconnections
- **LiveKit Connection**: Manages the underlying WebRTC connection

---

## Support

If you encounter issues with the idle timeout feature:

1. Check this user guide for troubleshooting steps
2. Review the browser console for error messages
3. Try resetting settings to defaults
4. Report issues to the development team with:
   - Browser and version
   - Steps to reproduce
   - Expected vs. actual behavior
   - Console logs (if available)

---

## Change Log

**Version 1.0** (October 27, 2025)
- Initial release
- Configurable timeout duration (30 seconds - 60 minutes)
- Visual warning banner (30 seconds before disconnect)
- Session storage persistence
- Accessibility features (WCAG 2.1 AA)
- Enable/disable toggle
- Configuration UI panel
