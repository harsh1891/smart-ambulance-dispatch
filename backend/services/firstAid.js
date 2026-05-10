const guidance = {
  accident: {
    title: "Road accident",
    steps: [
      "Move away from traffic only if it is safe and there is no suspected neck or spine injury.",
      "Do not remove a helmet unless breathing is blocked.",
      "Apply firm pressure on visible bleeding with a clean cloth.",
      "Keep the patient still and warm until ambulance arrives."
    ]
  },
  bleeding: {
    title: "Heavy bleeding",
    steps: [
      "Press directly on the wound with clean cloth or gauze.",
      "Keep pressure continuous; do not keep checking the wound.",
      "Raise the injured part if possible and safe.",
      "Do not remove deeply stuck objects; press around them."
    ]
  },
  heart_attack: {
    title: "Possible heart attack",
    steps: [
      "Make the patient sit down and rest with back support.",
      "Loosen tight clothing and keep the person calm.",
      "If the patient has prescribed heart medicine, help them take it as directed.",
      "If unconscious and not breathing normally, begin CPR if trained."
    ]
  },
  breathing: {
    title: "Breathing difficulty",
    steps: [
      "Help the patient sit upright; do not make them lie flat.",
      "Loosen tight clothing and keep the area ventilated.",
      "Help them use their prescribed inhaler if they have one.",
      "Watch for blue lips, confusion, or fainting and tell the ambulance driver."
    ]
  },
  stroke: {
    title: "Possible stroke",
    steps: [
      "Remember FAST: face drooping, arm weakness, speech trouble, time to emergency care.",
      "Note the exact time symptoms started.",
      "Do not give food, drink, or medicine unless a doctor instructs.",
      "Keep the patient on their side if vomiting or very drowsy."
    ]
  },
  burn: {
    title: "Burn injury",
    steps: [
      "Cool the burn under clean running water for at least 20 minutes.",
      "Remove rings, watches, or tight clothing near the burn if not stuck.",
      "Do not apply ice, toothpaste, butter, or oil.",
      "Cover loosely with a clean cloth or sterile dressing."
    ]
  },
  fracture: {
    title: "Possible fracture",
    steps: [
      "Keep the injured area still and supported.",
      "Do not try to straighten a deformed limb.",
      "Apply a cold pack wrapped in cloth if available.",
      "Watch for numbness, severe swelling, or pale skin beyond the injury."
    ]
  }
};

function getFirstAid(incidentType) {
  return {
    disclaimer:
      "This guidance is educational, not a doctor replacement. Call local emergency services immediately.",
    ...(guidance[incidentType] || guidance.accident)
  };
}

module.exports = { getFirstAid };
