export const ApplicationState: Readonly<Record<ApplicationStateKeys, string>> = Object.freeze({
    "active": "active",
    "pending": "pending",
    "denied": "denied",
    "accepted": "accepted"
});

export type ApplicationStateKeys = 'active' | 'pending' | 'denied' | 'accepted';
