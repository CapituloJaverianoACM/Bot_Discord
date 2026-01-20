export interface VoiceMasterState {
  ownerId: string;
  voiceChannelId: string;
  textChannelId: string;
  controlMessageId: string;
  baseName: string;
  emoji: string;
  status?: string;
  lfm?: boolean;
}

const state = new Map<string, VoiceMasterState>(); // voiceChannelId -> state

export function setVoiceState(vcId: string, data: VoiceMasterState) {
  state.set(vcId, data);
}

export function getVoiceState(vcId: string): VoiceMasterState | undefined {
  return state.get(vcId);
}

export function clearVoiceState(vcId: string) {
  state.delete(vcId);
}
