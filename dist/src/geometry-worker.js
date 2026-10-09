import {splitObject} from './cut-model.js';
self.onmessage=event=>{try{const {object,normal,offset,ratio}=event.data,result=splitObject(object,normal,offset,ratio);self.postMessage({ok:true,...result},result.pieces.flatMap(p=>[p.positions.buffer,p.indices.buffer]));}catch(error){self.postMessage({ok:false,error:error.message});}};
