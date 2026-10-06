/** An error with an HTTP status that is safe to show to the client. */
export default class AppError extends Error {
  constructor(status, message, code = undefined, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
