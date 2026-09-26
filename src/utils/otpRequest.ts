// Account routing is only for the initial request, never for resend/recovery.
export const shouldRouteRegisteredPhone = (recovery: boolean, resend: boolean) => !recovery && !resend;
