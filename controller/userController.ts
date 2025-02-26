import { v2 as cloudinary } from "cloudinary"
import { Request, Response } from "express"
import User from "../model/user"
import { redisClient } from "../utils/redisClient"

export const createUser = async (req: Request, res: Response): Promise<any> => {
    try {
        console.log("Request body:", req.body)
        console.log("Uploaded file:", req.file)

        let profileImageUrl = ""

        if (req.file) {
            try {
                const cloudinaryResponse = await cloudinary.uploader.upload(req.file.path, {
                    folder: "profile_uploads",
                })
                profileImageUrl = cloudinaryResponse.secure_url
            } catch (error) {
                return res.status(500).json({ message: "File upload failed", error })
            }
        }

        const userData = {
            name: req.body.name,
            email: req.body.email,
            mobile: req.body.mobile,
            address: req.body.address,
            city: req.body.city,
            gender: req.body.gender,
            language: req.body.language,
            date: req.body.date,
            terms: req.body.terms === "true",
            profile: profileImageUrl,
        }

        const newUser = new User(userData)
        await newUser.save()
        await redisClient.set("users", JSON.stringify(await User.find()), "EX", 3600)
        res.status(201).json({ message: "User created successfully", user: newUser })
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error })
    }
}


export const updateUser = async (req: Request, res: Response): Promise<any> => {
    try {
        const { id } = req.params
        console.log(id)
        const existingUser = await User.findById(id)
        if (!existingUser) {
            return res.status(404).json({ message: "user not found" })
        }

        let profileImageUrl = existingUser.profile
        if (req.file) {
            try {
                if (existingUser.profile) {
                    const oldImageId = existingUser.profile.split("/").pop()?.split(".")[0]
                    if (oldImageId) {
                        await cloudinary.uploader.destroy(`profile_uploas${oldImageId}`)
                    }
                }
                const cloudinaryResponse = await cloudinary.uploader.upload(req.file.path, {
                    folder: 'profile_uploas'
                })
                profileImageUrl = cloudinaryResponse.secure_url
            } catch (error) {
                return res.status(500).json({ message: "file upload failed", error })
            }
        }
        let languages: string[] = []
        if (typeof req.body.language === "string") {
            try {
                languages = JSON.parse(req.body.language)
            } catch (error) {
                languages = req.body.language.split("/").map((lang: string) => lang.trim())
            }
        } else if (Array.isArray(req.body.language)) {
            languages = req.body.language
        }

        const updateUser = await User.findByIdAndUpdate(
            id,
            {
                name: req.body.name,
                email: req.body.email,
                mobile: req.body.mobile,
                address: req.body.address,
                city: req.body.city,
                gender: req.body.gender,
                date: req.body.date,
                terms: req.body.terms === "true",
                language: languages,
                profile: profileImageUrl,
            },
            { new: true }
        )
        await redisClient.set("users", JSON.stringify(await User.find()), "EX", 3600)
        res.status(200).json({ message: "user update successfully", user: updateUser })
    } catch (error) {
        res.status(500).json({ message: "Internal server Error", error })
    }
}

export const deleteUser = async (req: Request, res: Response): Promise<any> => {
    try {
        const { id } = req.params
        const existingUser = await User.findById(id)
        if (!existingUser) {
            return res.status(404).json({ message: "User not found" })
        }
        if (existingUser.profile) {
            const imageId = existingUser.profile.split("/").pop()?.split(".")[0]
            if (imageId) {
                await cloudinary.uploader.destroy(`profile_uploads/${imageId}`)
            }
        }
        await User.findByIdAndDelete(id)
        await redisClient.set("users", JSON.stringify(await User.find()), "EX", 3600)
        res.status(200).json({ message: "User deleted successfully" })
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error })
    }
}



export const getUserProfile = async (req: Request, res: Response): Promise<any> => {
    try {
        const cachedUsers = await redisClient.get("users")
        if (cachedUsers) {
            console.log("serving from redis Cach")
            return res.status(200).json({ message: "data from cache", result: JSON.parse(cachedUsers) })
        }
        const result = await User.find()
        await redisClient.set("users", JSON.stringify(result), "EX", 3600)
        res.status(200).json({ message: "Profile find success", result })
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error })
    }
}

