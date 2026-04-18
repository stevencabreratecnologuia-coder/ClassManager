import mongoose from "mongoose";
import classroom from "./classroom";

const taskSchema= new mongoose.Schema({
    title: {
        type:String,
        required: true,
        trim: true
    },
    descripcion:{
        type:String,
        required: true,
        trim: true
    },
    fechaEntrega:{
        type:Date,
        required: true,
    },
    profesorId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },
    classroomId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Classroom"
    },
    assessmentMethods:{
        type:String,
        required:true,
        trim: true,
    }
},{timestamps:true});

export default mongoose.model("Task", taskSchema);