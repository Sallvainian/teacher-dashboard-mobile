// Simple client-side error handler without Sentry
export const handleError = ({ error, event, status, message }: { error: unknown; event: unknown; status: number; message: string }) => {
	console.error("An error occurred on the client side:", error, event, status, message);
};