import mongoose  from "mongoose"; 

const classroomSchema = new mongoose.Schema({
    grade:{
        type:String,
        required:true,
        unique: true,
        trim: true
    },
    profesorId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },
    estudiantes:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }]
},{timestamps:true});

export default mongoose.model("Classroom",classroomSchema);
