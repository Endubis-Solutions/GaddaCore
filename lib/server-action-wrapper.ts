import { AxiosError } from "axios";

export type ServerActionResponse<T> = {
    success: true,
    data: T
} | {
    success: false,
    message: string
    data: null
}

export const serverActionWrapper = <
    Args extends unknown[],
    T
>(
    fn: (...args: Args) => Promise<T>
) => {
    return async (...args: Args): Promise<ServerActionResponse<T>> => {
        try {
            const response = await fn(...args);
            return { success: true, data: response, }
        } catch (error) {
            let errMsg = "An error occurred while processing your request.";

            if (error instanceof AxiosError) {
                const data = error.response?.data as { message?: string };
                if (data?.message) errMsg = data.message;
            } else if (error instanceof Error) {
                errMsg = error.message;
            }

            return {
                success: false,
                message: errMsg,
                data: null,
            } as const;
        }
    };
};



export const throwFailedActions = (data: ServerActionResponse<unknown>) => {
    if (!data.success) {
        throw new Error(data.message)
    }
}