import mongoose, { mongo } from "mongoose";

const taskSentSchema = new mongoose.Schema({

    estudianteId:{
        types:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },
    task:{
        types:mongoose.Schema.Types.ObjectId,
        ref:"Task"
    },
    filies:{
        type:String,
        required:true,
        trim:true
    },
    fechaEntrega:{
        type:Date
    },
    state:{
        type:String,
        enum:["Entregado","Tarde"],
        default:"Entregado"
    },
    analysisIa:{
        possibleIa:{
            type:Boolean
        },
        porcentageIa:{
            type:Number
        },
        feedback:{
            type:String
        }    
    },
    answer:{
        ask:String,
        answer:String,
        typeAnswer:{
            type:String,
            enum:["Audio","Texto"]
        }
    },
    note:Number,

    teacherComments:String


},{timestamps:true});

export default mongoose.model("TaskSent", taskSentSchema);