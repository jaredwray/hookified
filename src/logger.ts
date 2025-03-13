export type Logger = {
	trace: (message: string, ...arguments_: unknown[]) => void;
	debug: (message: string, ...arguments_: unknown[]) => void;
	info: (message: string, ...arguments_: unknown[]) => void;
	warn: (message: string, ...arguments_: unknown[]) => void;
	error: (message: string, ...arguments_: unknown[]) => void;
	fatal: (message: string, ...arguments_: unknown[]) => void;
};
