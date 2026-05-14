// Validate board ID

const regex = /^[A-Za-z0-9_-]{6,160}$/;
console.log(regex.test("some_ID-123")); // true
