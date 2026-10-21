import bank from '../../site/data/lop-cu-chi.json' with { type: 'json' };
export function validateCuchi(input){
 const name=typeof input?.playerName==='string'?input.playerName.trim().replace(/\s+/g,' '):'';
 if(name.length<2||name.length>80||!['Lớp tin học 1 + 2','Lớp tin học 3 + 4'].includes(input.className))throw Error('Họ tên hoặc lớp không hợp lệ.');
 if(!/^[a-zA-Z0-9-]{8,80}$/.test(input.attemptId||''))throw Error('Mã bài không hợp lệ.');
 if(!Number.isInteger(input.duration)||input.duration<0||input.duration>1800)throw Error('Thời gian không hợp lệ.');
 if(!Array.isArray(input.questionIds)||input.questionIds.length!==15||new Set(input.questionIds).size!==15)throw Error('Đề cần 15 câu khác nhau.');
 if(!input.answers||typeof input.answers!=='object'||Array.isArray(input.answers))throw Error('Đáp án không hợp lệ.');
 let correct=0;for(const id of input.questionIds){const q=bank.questions.find(q=>q.id===id);if(!q)throw Error('Câu hỏi không thuộc bộ Củ Chi.');const a=input.answers[id];if(a!==undefined&&(!Number.isInteger(a)||a<0||a>=q.options.length))throw Error('Đáp án không hợp lệ.');if(a===q.answer)correct++;}
 return {attemptId:input.attemptId,playerName:name,className:input.className,correct,duration:input.duration};
}
export async function saveCuchi(request,env,respond){
 const origin=request.headers.get('origin');if(!origin||!String(env.ALLOWED_ORIGINS).split(',').includes(origin))return respond(request,env,{error:'Origin không được phép.'},403);
 let s;try{const body=await request.text();if(body.length>12000)throw Error('Dữ liệu quá lớn.');s=validateCuchi(JSON.parse(body));}catch(e){return respond(request,env,{error:e.message},400);}
 await env.DB.prepare('INSERT INTO cuchi_results (attempt_id,player_name,class_name,correct_answers,total_questions,duration_seconds,submitted_at) VALUES (?,?,?,?,15,?,?) ON CONFLICT(attempt_id) DO NOTHING').bind(s.attemptId,s.playerName,s.className,s.correct,s.duration,Date.now()).run();
 return respond(request,env,{ok:true,correct:s.correct,total:15},201);
}
