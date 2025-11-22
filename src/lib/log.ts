export function debugLog(message: any, ...optionalParams: any[]) {
  if (process.env.DEBUG === "true") {
    console.log(message, ...optionalParams);
  }
}
