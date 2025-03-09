import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import { encrypt } from '@/lib/encrypt';

const prisma = new PrismaClient()

type ResponseData = {
    message: string
}

export default function handler(
    req: NextApiRequest,
    res: NextApiResponse<ResponseData>
) {
    if (req.method === 'GET') {
        const { email, password, urlEnding } = req.query;

        if (!email || !password || !urlEnding) {
            res.status(500).json({ message: 'Email, password or urlEnding not provided.' });
            return;
        }

        const emailStr = Array.isArray(email) ? email[0] : email;

        prisma.accountData.findUnique({
            where: {
                email: emailStr
            }
        })
            .then(account => {
                if (account) {
                    res.status(409).json({ message: `A user with this E-Mail already exists.` });
                } else {

                    const urlEndingStr = Array.isArray(urlEnding) ? urlEnding[0] : urlEnding;

                    prisma.accountData.findUnique({
                        where: {
                            urlEnding: urlEndingStr
                        }
                    })
                        .then(account => {
                            if (account) {
                                res.status(409).json({ message: `this URL ending does already exist.` })
                            } else {
                                const encryptedEmail = encrypt(emailStr);
                                const passwordStr = Array.isArray(password)? password[0]: password;
                                const encryptedPassword = encrypt(passwordStr);
                                prisma.accountData.create({
                                    data: {
                                        email: encryptedEmail,
                                        password: encryptedPassword,
                                        urlEnding: urlEndingStr,
                                    }
                                })
                            }
                        })
                }
            })
            .catch(err => {
                res.status(500).json({ message: 'Error querying the database.' });
            });
    } else {
        res.status(405).json({ message: 'Method Not Allowed' });
    }
}
