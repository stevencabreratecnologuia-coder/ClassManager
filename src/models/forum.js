import mongoose from "mongoose";

const forumSchema= new mongoose.Schema({

    taskId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Task"
    },
    title:{
        type:String,
        required:true,
        trim:true
    }

},{timestamps:true});

export default mongoose.model("Forum",forumSchema);