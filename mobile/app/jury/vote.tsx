import { useRouter } from 'expo-router';

import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { JuryEvidencePacket } from '../../src/features/jury/components/JuryEvidencePacket';
import { JuryFlowFrame } from '../../src/features/jury/components/JuryFlowFrame';
import { juryAssignment, juryEvidenceSides } from '../../src/mocks/jury';

export default function JuryVoteScreen() {
  const router = useRouter();

  return (
    <JuryFlowFrame
      eyebrow="Vote"
      onBack={() => router.back()}
      title="Choose packet."
      subtitle="Review A and B without player identities. Vote for the packet better supported by evidence."
    >
      <JuryEvidencePacket
        caseTitle={juryAssignment.title}
        onVoteA={() => router.push('/jury/receipt?vote=A')}
        onVoteB={() => router.push('/jury/receipt?vote=B')}
        sides={juryEvidenceSides}
      />
      <InlineAlert
        tone="warning"
        title="Vote cannot be changed"
        message="Submit only after reading both packets and checking the attached evidence counts."
      />
    </JuryFlowFrame>
  );
}
