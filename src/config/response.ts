import { Response } from 'express'
export const responseSend = (res: Response, data: any, message: string, code: number) => {
    res.status(code).json({
        statusCode: code,
        content: data,
        message,
        date: new Date()
    })
}