// Global type declarations for rrweb v1

// rrweb v1 console plugin (named export, no types in source)
declare module 'rrweb/dist/plugins/console-record' {
  export function getRecordConsolePlugin(_options: any): any;
}

// Image file declarations
declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.jpeg' {
  const value: string;
  export default value;
}

declare module '*.svg' {
  const value: string;
  export default value;
}

declare module '*.gif' {
  const value: string;
  export default value;
}

declare module '*.webp' {
  const value: string;
  export default value;
}
