import mongoose from "mongoose";

const aiSchema = new mongoose.Schema({

    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },
    context:{
        type:String
    },
    messageUser:{
        type:String
    },
    answerIa:{
        type:String
    },
    gender:{
        type:String,
        enum:["Chat","Feedback","Evaluacion"]
    }

},{timestamps:true});

export default mongoose.model("Ai", aiSchema);