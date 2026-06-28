import { Send, Users } from 'lucide-react-native';

import { colors } from '../../../theme/tokens';
import type { CreateDareDraft } from '../types';
import { CreatePressCard as PressCard, CreateSectionTitle as SectionTitle } from './CreateScreenParts';

type CreateVisibilitySectionProps = {
  onChange: (visibility: CreateDareDraft['visibility']) => void;
  visibility: CreateDareDraft['visibility'];
};

export function CreateVisibilitySection({ onChange, visibility }: CreateVisibilitySectionProps) {
  return (
    <>
      <SectionTitle eyebrow="Invite" icon={<Users color={colors.primary} size={16} />} title="Choose who can accept" />
      <PressCard
        body="Public feed DARE. Any eligible player can review and accept through server checks."
        icon={<Users color={colors.textMuted} size={17} />}
        label="Open to anyone"
        onPress={() => onChange('open')}
        selected={visibility === 'open'}
      />
      <PressCard
        body="Send this DARE to one username. The invite link still requires normal accept validation."
        icon={<Send color={colors.textMuted} size={17} />}
        label="Send to someone"
        onPress={() => onChange('targeted')}
        selected={visibility === 'targeted'}
      />
    </>
  );
}
