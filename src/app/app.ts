import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { VoiceChatComponent } from './components/voice-chat/voice-chat.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, VoiceChatComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('melior-agent');
}
