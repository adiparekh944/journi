type RequestHandler = (request: Request) => Response | Promise<Response>;

type DenoRuntime = {
  env: {
    get(name: string): string | undefined;
  };
  serve(handler: RequestHandler): void;
};

const denoRuntime = (globalThis as typeof globalThis & { Deno: DenoRuntime }).Deno;

export function environmentValue(name: string): string {
  const value = denoRuntime.env.get(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function optionalEnvironmentValue(name: string): string | undefined {
  return denoRuntime.env.get(name);
}

export function serve(handler: RequestHandler): void {
  denoRuntime.serve(handler);
}
