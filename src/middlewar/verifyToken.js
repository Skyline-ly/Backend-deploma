import jwt from 'jsonwebtoken'

export const verifiveToken = (req, res, next) => {
    const authToken = req.headers.authorization

   
    if (!authToken || !authToken.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Access denied. No token provided.' })
    }

  
    const token = authToken.split(' ')[1]
    if (!token) {
        return res.status(401).json({ message: 'Access denied. Token missing.' })
    }

    try {
        const secretKey = process.env.JWT_SECRET
        const decoded = jwt.verify(token, secretKey)
        req.user = decoded
        console.log(req.user)
        
        next()
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token.' })
    }
}