/**
 * Since you define your own methods with their own names for generating keys
 * of all sorts, this interface is intentionally left blank so it can offer
 * maximum flexibility while still providing type safety.
 */
export interface KeyDecorator {}

/**
 * All a KeyDecorator class needs is one or more methods with this signature.
 * The Writers will call it to generate keys. It accepts any number of strings
 * because sometimes you need to shard a thing and in those cases you really
 * like having the option to label keys 2 dimensionally. such as
 * /prod-eu/database-shard/12
 */
export type KeyDecoratorPrototype = { (...args: string[]): string };
