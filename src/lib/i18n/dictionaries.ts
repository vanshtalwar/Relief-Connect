export type Dictionary = typeof en;

export const en = {
  common: {
    home: "Home",
    dashboard: "Dashboard",
    myRequests: "My requests",
    coordinator: "Coordinator",
    analytics: "Analytics",
    newRequest: "New request",
    logout: "Log Out",
    login: "Log In",
    loading: "Loading...",
    error: "An error occurred",
    back: "Back",
    next: "Next",
    submit: "Submit",
    cancel: "Cancel",
  },
  sos: {
    buttonText: "SOS PANIC",
    sending: "SENDING...",
    success: "SOS Sent",
    error: "SOS failed to send",
  },
  form: {
    step: "Step",
    offlineReady: "Offline queue ready",
    title: "Title",
    description: "Description",
    category: "Category",
    urgency: "Urgency",
    contactName: "Contact name",
    contactPhone: "Contact phone",
    contactEmail: "Contact email",
    photoOptional: "Photo Verification (Optional)",
  }
};

export const hi: Dictionary = {
  common: {
    home: "होम",
    dashboard: "डैशबोर्ड",
    myRequests: "मेरे अनुरोध",
    coordinator: "समन्वयक",
    analytics: "एनालिटिक्स",
    newRequest: "नया अनुरोध",
    logout: "लॉग आउट",
    login: "लॉग इन",
    loading: "लोड हो रहा है...",
    error: "एक त्रुटि हुई",
    back: "पीछे",
    next: "अगला",
    submit: "जमा करें",
    cancel: "रद्द करें",
  },
  sos: {
    buttonText: "आपातकाल",
    sending: "भेजा जा रहा है...",
    success: "एसओएस भेजा गया",
    error: "एसओएस भेजने में विफल",
  },
  form: {
    step: "कदम",
    offlineReady: "ऑफ़लाइन कतार तैयार",
    title: "शीर्षक",
    description: "विवरण",
    category: "श्रेणी",
    urgency: "तत्काल",
    contactName: "संपर्क का नाम",
    contactPhone: "संपर्क फोन",
    contactEmail: "संपर्क ईमेल",
    photoOptional: "फोटो सत्यापन (वैकल्पिक)",
  }
};

export const dictionaries = { en, hi };
export type Language = keyof typeof dictionaries;
