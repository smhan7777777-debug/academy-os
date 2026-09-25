export class DomainError extends Error {
  constructor(message, status = 422) {
    super(message);
    this.status = status;
  }
}
export const check = (value, message, status = 422) => {
  if (!value) throw new DomainError(message, status);
};
