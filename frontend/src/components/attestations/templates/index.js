import AttestationDefault from './AttestationDefault';

export const attestationTemplates = {
  default: AttestationDefault,
  // xxx_formation: AttestationXxx,  ← add only when a formation needs a different layout
};

export const getTemplateForFormation = (formation) =>
  attestationTemplates[formation?.template_key] ?? attestationTemplates.default;