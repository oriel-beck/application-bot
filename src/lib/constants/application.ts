export enum ApplicationState {
    "active" = "active",
    "pending" = "pending",
    "denied" = "denied",
    "accepted" = "accepted",
    "deleted" = "deleted"
}



export type ApplicationStateKeys = keyof typeof ApplicationState
