
import { User } from '../model/User.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

import asynchandler from 'express-async-handler'



export const register = asynchandler(async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            success: false,
            message: 'All fields are required'
        });
    }

    if (typeof email !== 'string') {
        return res.status(400).json({
            success: false,
            message: 'Invalid email format'
        });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const userExists = await User.findOne({
        email: normalizedEmail
    });

    if (userExists) {
        return res.status(400).json({
            success: false,
            message: 'Email already registered.'
        });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const createdUser = await User.create({
        name,
        email: normalizedEmail,
        password: hashPassword,
        role: 'customer',
        sellerStatus: 'none'
    });

    return res.status(201).json({
        success: true,
        message: 'Customer account created successfully.',
        data: {
            id: createdUser._id,
            name: createdUser.name,
            email: createdUser.email,
            role: createdUser.role,
            sellerStatus: createdUser.sellerStatus
        }
    });
});


export const login=asynchandler(async (req, res) => {
    const { email, password } = req.body

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' })
    }
    const normalizedEmail=email.trim().toLowerCase()

    const user = await User.findOne({ email :normalizedEmail})
    if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' })
    }

    if (!user.isActive) {
        return res.status(403).json({ message: 'Your account has been deactivated' })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid email or password' })
    }

    const secretKey = process.env.JWT_SECRET
    const refreshSecretKey=process.env.REFRESH_TOKEN_SECRET
    const accessToken = jwt.sign(
        {    userId: user._id,         
             role: user.role,
             sellerStatus: user.sellerStatus },
        secretKey,
        { expiresIn: '30m' }
    )
    const refreshToken=jwt.sign(
        { userId: user._id,
            sellerStatus: user.sellerStatus },
        refreshSecretKey,
        { expiresIn: '3d' }

    )
    const tokenRefreshHash=await bcrypt.hash(refreshToken,12)
    user.refreshToken=tokenRefreshHash
    await user.save()

     res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
    return res.status(200).json({
        success: true,
        message: 'Login successful',
        accessToken,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            sellerStatus: user.sellerStatus
        }
    })
})


export const refreshToken = asynchandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(401).json({
            success: false,
            message: 'Refresh token required'
        });
    }

    let decoded;

    try {
        decoded = jwt.verify(
            refreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired refresh token'
        });
    }

    const user = await User.findById(decoded.userId);

    if (!user) {
        return res.status(401).json({
            success: false,
            message: 'User not found'
        });
    }

    if (!user.isActive) {
        return res.status(403).json({
            success: false,
            message: 'Account is inactive'
        });
    }

    const isRefreshTokenValid = await bcrypt.compare(
        refreshToken,
        user.refreshToken
    );

    if (!isRefreshTokenValid) {
        return res.status(401).json({
            success: false,
            message: 'Refresh token is invalid'
        });
    }

    const accessToken = jwt.sign(
        {
            userId: user._id,
            role: user.role,
            sellerStatus: user.sellerStatus
        },
        process.env.JWT_SECRET,
        {
            expiresIn: '30m'
        }
    );

    return res.status(200).json({
        success: true,
        accessToken
    });
});
