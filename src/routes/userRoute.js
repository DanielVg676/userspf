import express from "express";
import {getUsers, createUsers, updateUser, deleteUser, login, changePasswordByEmail, changePassword } from "../controllers/userController.js";

const router = express.Router();

router.get('/getUsers', getUsers);
router.post('/newUser', createUsers);
router.patch('/update/:id', updateUser);
router.patch('/deleteUser/:id', deleteUser);
router.post('/login', login);
router.get('/change-password/:email', changePasswordByEmail);
router.post('/password', changePassword);
// router.post('/recoverPassword', forgottenPassword);

export default router;
