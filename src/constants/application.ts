export const ApplicationState: Readonly<Record<ApplicationStateKeys, ApplicationStateKeys>> = Object.freeze({
    "active": "active",
    "pending": "pending",
    "denied": "denied",
    "accepted": "accepted"
});

export type ApplicationStateKeys = 'active' | 'pending' | 'denied' | 'accepted';
