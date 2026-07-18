import { useState, useCallback, useRef, useEffect } from "react";

// ── Chess Logic ──────────────────────────────────────────────────────────────
const PIECES = {
  wK:"♔",wQ:"♕",wR:"♖",wB:"♗",wN:"♘",wP:"♙",
  bK:"♚",bQ:"♛",bR:"♜",bB:"♝",bN:"♞",bP:"♟",
};

function initBoard() {
  const b = Array(8).fill(null).map(()=>Array(8).fill(null));
  const order = ["R","N","B","Q","K","B","N","R"];
  order.forEach((p,i)=>{ b[0][i]=`b${p}`; b[7][i]=`w${p}`; });
  for(let i=0;i<8;i++){b[1][i]="bP";b[6][i]="wP";}
  return b;
}

const col  = p => p?p[0]:null;
const typ  = p => p?p[1]:null;
const opp  = c => c==="w"?"b":"w";
const inB  = (r,c) => r>=0&&r<8&&c>=0&&c<8;

function rawMoves(board,r,c,ep){
  const piece=board[r][c]; if(!piece) return [];
  const pc=col(piece),pt=typ(piece); const mv=[];
  const push=(tr,tc)=>{ if(inB(tr,tc)) mv.push([tr,tc]); };
  if(pt==="P"){
    const dir=pc==="w"?-1:1, sr=pc==="w"?6:1;
    if(inB(r+dir,c)&&!board[r+dir][c]){
      push(r+dir,c);
      if(r===sr&&!board[r+2*dir][c]) push(r+2*dir,c);
    }
    for(const dc of[-1,1]){
      if(inB(r+dir,c+dc)){
        if(board[r+dir][c+dc]&&col(board[r+dir][c+dc])===opp(pc)) push(r+dir,c+dc);
        if(ep&&ep[0]===r+dir&&ep[1]===c+dc) push(r+dir,c+dc);
      }
    }
  } else if(pt==="N"){
    for(const[dr,dc] of[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]){
      const[tr,tc]=[r+dr,c+dc];
      if(inB(tr,tc)&&col(board[tr][tc])!==pc) push(tr,tc);
    }
  } else if(pt==="K"){
    for(const[dr,dc] of[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]){
      const[tr,tc]=[r+dr,c+dc];
      if(inB(tr,tc)&&col(board[tr][tc])!==pc) push(tr,tc);
    }
  } else {
    const dirs=pt==="R"?[[0,1],[0,-1],[1,0],[-1,0]]:
               pt==="B"?[[1,1],[1,-1],[-1,1],[-1,-1]]:
               [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
    for(const[dr,dc] of dirs){
      let[tr,tc]=[r+dr,c+dc];
      while(inB(tr,tc)){
        if(board[tr][tc]){if(col(board[tr][tc])!==pc)push(tr,tc);break;}
        push(tr,tc); tr+=dr;tc+=dc;
      }
    }
  }
  return mv;
}

function findKing(board,c){
  for(let r=0;r<8;r++)for(let cc=0;cc<8;cc++)
    if(board[r][cc]===c+"K")return[r,cc];
  return null;
}

function isAttacked(board,r,c,byColor){
  for(let fr=0;fr<8;fr++)for(let fc=0;fc<8;fc++){
    if(col(board[fr][fc])===byColor){
      if(rawMoves(board,fr,fc,null).some(([tr,tc])=>tr===r&&tc===c))return true;
    }
  }
  return false;
}

function applyMove(board,fr,fc,tr,tc,ep){
  const b=board.map(row=>[...row]);
  const piece=b[fr][fc]; b[tr][tc]=piece; b[fr][fc]=null;
  if(typ(piece)==="P"&&ep&&tr===ep[0]&&tc===ep[1]) b[fr][tc]=null;
  return b;
}

function legalMoves(board,r,c,ep,cr){
  const piece=board[r][c]; if(!piece)return[];
  const pc=col(piece),pt=typ(piece);
  let mv=rawMoves(board,r,c,ep);
  if(pt==="K"){
    const row=pc==="w"?7:0;
    if(r===row&&c===4){
      if(cr[pc].kingSide&&!board[row][5]&&!board[row][6]&&board[row][7]===pc+"R"&&
         !isAttacked(board,row,4,opp(pc))&&!isAttacked(board,row,5,opp(pc))&&!isAttacked(board,row,6,opp(pc)))
        mv.push([row,6]);
      if(cr[pc].queenSide&&!board[row][3]&&!board[row][2]&&!board[row][1]&&board[row][0]===pc+"R"&&
         !isAttacked(board,row,4,opp(pc))&&!isAttacked(board,row,3,opp(pc))&&!isAttacked(board,row,2,opp(pc)))
        mv.push([row,2]);
    }
  }
  return mv.filter(([tr,tc])=>{
    let nb=applyMove(board,r,c,tr,tc,ep);
    if(pt==="K"&&Math.abs(tc-c)===2){
      const row=pc==="w"?7:0;
      if(tc===6){nb[row][5]=pc+"R";nb[row][7]=null;}
      else{nb[row][3]=pc+"R";nb[row][0]=null;}
    }
    const kp=findKing(nb,pc);
    return kp&&!isAttacked(nb,kp[0],kp[1],opp(pc));
  });
}

function isInCheck(board,c){ const kp=findKing(board,c); return kp&&isAttacked(board,kp[0],kp[1],opp(c)); }

function hasAnyLegal(board,c,ep,cr){
  for(let r=0;r<8;r++)for(let cc=0;cc<8;cc++)
    if(col(board[r][cc])===c&&legalMoves(board,r,cc,ep,cr).length>0)return true;
  return false;
}

const FILES=["a","b","c","d","e","f","g","h"];
const RANKS=["8","7","6","5","4","3","2","1"];
const sqLabel=(r,c)=>FILES[c]+RANKS[r];

// ── Main Component ────────────────────────────────────────────────────────────

export default function Chess(){
  const [board,setBoard]     = useState(initBoard);
  const [turn,setTurn]       = useState("w");
  const [selected,setSelected] = useState(null);
  const [highlights,setHighlights] = useState([]);
  const [ep,setEp]           = useState(null);
  const [cr,setCr]           = useState({w:{kingSide:true,queenSide:true},b:{kingSide:true,queenSide:true}});
  const [status,setStatus]   = useState(null);
  const [history,setHistory] = useState([]);
  const [promotion,setPromotion] = useState(null);
  const [lastMove,setLastMove] = useState(null);
  const [capW,setCapW]       = useState([]);
  const [capB,setCapB]       = useState([]);

  // drag state (refs so we don't re-render mid-drag)
  const dragRef = useRef(null); // {r,c,piece,x,y,squareSize}
  const [dragPos,setDragPos] = useState(null); // {x,y,piece}
  const [dragOver,setDragOver] = useState(null); // [r,c]
  const boardRef = useRef(null);

  const computeStatus = useCallback((b,c,e,r)=>{
    const inCheck=isInCheck(b,c), hasLegal=hasAnyLegal(b,c,e,r);
    if(!hasLegal) return inCheck?"checkmate":"stalemate";
    if(inCheck) return "check";
    return null;
  },[]);

  const doMove = useCallback((fromR,fromC,toR,toC,boardState,epState,crState,hist,cW,cB)=>{
    const piece=boardState[fromR][fromC];
    const pc=col(piece),pt=typ(piece);
    let nb=applyMove(boardState,fromR,fromC,toR,toC,epState);
    let nW=[...cW],nB=[...cB];
    if(boardState[toR][toC])(pc==="w"?nW:nB).push(boardState[toR][toC]);
    if(pt==="P"&&epState&&toR===epState[0]&&toC===epState[1])(pc==="w"?nW:nB).push(boardState[fromR][toC]);
    let nCr={w:{...crState.w},b:{...crState.b}};
    if(pt==="K"){
      if(Math.abs(toC-fromC)===2){
        const row=pc==="w"?7:0;
        if(toC===6){nb[row][5]=pc+"R";nb[row][7]=null;}
        else{nb[row][3]=pc+"R";nb[row][0]=null;}
      }
      nCr[pc]={kingSide:false,queenSide:false};
    }
    if(pt==="R"){
      const row=pc==="w"?7:0;
      if(fromR===row&&fromC===7)nCr[pc].kingSide=false;
      if(fromR===row&&fromC===0)nCr[pc].queenSide=false;
    }
    let newEp=null;
    if(pt==="P"&&Math.abs(toR-fromR)===2)newEp=[Math.round((toR+fromR)/2),toC];
    if(pt==="P"&&(toR===0||toR===7)){
      setPromotion({r:toR,c:toC,from:[fromR,fromC],board:nb,ep:newEp,cr:nCr,hist,pc,capW:nW,capB:nB});
      return;
    }
    const nextTurn=opp(pc),st=computeStatus(nb,nextTurn,newEp,nCr);
    setBoard(nb);setTurn(nextTurn);setEp(newEp);setCr(nCr);
    setLastMove([fromR,fromC,toR,toC]);
    setHistory([...hist,sqLabel(fromR,fromC)+sqLabel(toR,toC)]);
    setStatus(st);setCapW(nW);setCapB(nB);
    setSelected(null);setHighlights([]);
  },[computeStatus]);

  const handlePromotion = useCallback((pt2)=>{
    const{r,c,board:nb,ep:e,cr:r2,hist,pc,capW:cW,capB:cB}=promotion;
    const promoted=nb.map(row=>[...row]);
    promoted[r][c]=pc+pt2;
    const nextTurn=opp(pc),st=computeStatus(promoted,nextTurn,e,r2);
    setBoard(promoted);setTurn(nextTurn);setEp(e);setCr(r2);
    setLastMove([promotion.from[0],promotion.from[1],r,c]);
    setHistory([...hist,sqLabel(promotion.from[0],promotion.from[1])+sqLabel(r,c)+"="+pt2]);
    setStatus(st);setCapW(cW);setCapB(cB);
    setSelected(null);setHighlights([]);setPromotion(null);
  },[promotion,computeStatus]);

  // click handler (fallback / tap)
  const handleSquare = useCallback((r,c)=>{
    if(status==="checkmate"||status==="stalemate"||promotion)return;
    if(selected){
      const[sr,sc]=selected;
      if(highlights.some(([tr,tc])=>tr===r&&tc===c)){
        doMove(sr,sc,r,c,board,ep,cr,history,capW,capB);return;
      }
    }
    const piece=board[r][c];
    if(piece&&col(piece)===turn){ setSelected([r,c]); setHighlights(legalMoves(board,r,c,ep,cr)); }
    else{ setSelected(null); setHighlights([]); }
  },[board,turn,selected,highlights,ep,cr,status,promotion,history,capW,capB,doMove]);

  // ── Pointer drag handlers ────────────────────────────────────────────────
  const squarePosFromPoint = useCallback((clientX,clientY)=>{
    if(!boardRef.current)return null;
    const rect=boardRef.current.getBoundingClientRect();
    // board grid starts after the 20px rank label column
    const labelW=20, labelH=20;
    const innerW=rect.width-labelW, innerH=rect.height-labelH;
    const sqW=innerW/8, sqH=innerH/8;
    const x=clientX-rect.left-labelW;
    const y=clientY-rect.top;
    const c=Math.floor(x/sqW), r=Math.floor(y/sqH);
    if(r<0||r>7||c<0||c>7)return null;
    return[r,c];
  },[]);

  const onPointerDown = useCallback((e,r,c)=>{
    if(status==="checkmate"||status==="stalemate"||promotion)return;
    const piece=board[r][c];
    if(!piece||col(piece)!==turn)return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const moves=legalMoves(board,r,c,ep,cr);
    setSelected([r,c]);
    setHighlights(moves);
    dragRef.current={r,c,piece,moves};
    setDragPos({x:e.clientX,y:e.clientY,piece});
    e.preventDefault();
  },[board,turn,ep,cr,status,promotion]);

  const onPointerMove = useCallback((e)=>{
    if(!dragRef.current)return;
    setDragPos({x:e.clientX,y:e.clientY,piece:dragRef.current.piece});
    const sq=squarePosFromPoint(e.clientX,e.clientY);
    setDragOver(sq);
    e.preventDefault();
  },[squarePosFromPoint]);

  const onPointerUp = useCallback((e)=>{
    if(!dragRef.current)return;
    const{r:fr,c:fc,moves}=dragRef.current;
    const sq=squarePosFromPoint(e.clientX,e.clientY);
    dragRef.current=null;
    setDragPos(null);
    setDragOver(null);
    if(sq){
      const[tr,tc]=sq;
      if(moves.some(([mr,mc])=>mr===tr&&mc===tc)){
        doMove(fr,fc,tr,tc,board,ep,cr,history,capW,capB);
        return;
      }
    }
    // dropped on invalid square — keep selection
  },[squarePosFromPoint,board,ep,cr,history,capW,capB,doMove]);

  const resetGame=()=>{
    setBoard(initBoard());setTurn("w");setSelected(null);setHighlights([]);
    setEp(null);setCr({w:{kingSide:true,queenSide:true},b:{kingSide:true,queenSide:true}});
    setStatus(null);setHistory([]);setPromotion(null);setLastMove(null);setCapW([]);setCapB([]);
    dragRef.current=null;setDragPos(null);setDragOver(null);
  };

  const isHL=(r,c)=>highlights.some(([tr,tc])=>tr===r&&tc===c);
  const isSel=(r,c)=>selected&&selected[0]===r&&selected[1]===c;
  const isLM=(r,c)=>lastMove&&((lastMove[0]===r&&lastMove[1]===c)||(lastMove[2]===r&&lastMove[3]===c));
  const isDO=(r,c)=>dragOver&&dragOver[0]===r&&dragOver[1]===c;
  const isDragging=(r,c)=>dragRef.current&&dragRef.current.r===r&&dragRef.current.c===c;

  const turnLabel=turn==="w"?"White":"Black";
  const winnerLabel=status==="checkmate"?(turn==="w"?"Black":"White"):null;
  const grp=arr=>arr.reduce((a,p)=>{a[p]=(a[p]||0)+1;return a;},{});

  const sqSize = "clamp(40px,8vw,70px)";

  return (
    <div
      style={{minHeight:"100vh",background:"#1a1a2e",display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",fontFamily:"Georgia,serif",
        padding:"16px",boxSizing:"border-box",touchAction:"none"}}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Header */}
      <div style={{textAlign:"center",marginBottom:"16px"}}>
        <h1 style={{margin:0,fontSize:"clamp(22px,4vw,38px)",letterSpacing:"0.12em",
          color:"#e8d5a3",fontWeight:"normal",textTransform:"uppercase"}}>♟ Chess</h1>
        <p style={{margin:"4px 0 0",color:"#8a7a5a",fontSize:"12px",letterSpacing:"0.08em"}}>
          Pass &amp; Play · Two Players · Drag or Click
        </p>
      </div>

      <CapturedBar pieces={grp(capB)} label="Black captured"/>

      {/* Board wrapper — relative so floating ghost stays inside viewport */}
      <div style={{position:"relative"}}>
        {/* Left dot */}
        <div style={{position:"absolute",left:"-60px",top:0,bottom:0,width:"12px",
          display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{width:"8px",height:"8px",borderRadius:"50%",transition:"all .3s",
            background:turn==="b"&&!status?.includes("mate")&&status!=="stalemate"?"#e8d5a3":"transparent",
            boxShadow:turn==="b"&&!status?.includes("mate")&&status!=="stalemate"?"0 0 8px #e8d5a3":"none"}}/>
        </div>

        {/* Board grid */}
        <div ref={boardRef} style={{
          display:"grid",
          gridTemplateColumns:`20px repeat(8,${sqSize}) 20px`,
          gridTemplateRows:`repeat(8,${sqSize}) 20px`,
          gap:0,boxShadow:"0 20px 60px rgba(0,0,0,.6)",border:"3px solid #3d3018",
          userSelect:"none"
        }}>
          {Array(8).fill(null).map((_,r)=>(
            <>
              <div key={`rl${r}`} style={{display:"flex",alignItems:"center",justifyContent:"center",
                background:"#2a2010",color:"#6a5a3a",fontSize:"11px",width:"20px"}}>
                {RANKS[r]}
              </div>

              {Array(8).fill(null).map((_2,c)=>{
                const light=(r+c)%2===0;
                const piece=board[r][c];
                const sel=isSel(r,c);
                const hl=isHL(r,c);
                const lm=isLM(r,c);
                const dropTarget=isDO(r,c)&&hl;
                const dragging=isDragging(r,c);
                const inChk=status==="check"&&piece===turn+"K";

                let bg=light?"#f0d9b5":"#b58863";
                if(lm) bg=light?"#cdd26a":"#aaa23a";
                if(sel||dragging) bg="#7fc97f";
                if(dropTarget) bg=light?"#90ee90":"#3a8a3a";
                if(inChk) bg="#e74c3c";

                return (
                  <div key={`sq${r}${c}`}
                    style={{background:bg,cursor:piece&&col(piece)===turn?"grab":"default",
                      position:"relative",display:"flex",alignItems:"center",justifyContent:"center",
                      transition:"background .12s"}}
                    onClick={()=>{ if(!dragRef.current) handleSquare(r,c); }}
                    onPointerDown={e=>onPointerDown(e,r,c)}
                  >
                    {hl&&!piece&&!dropTarget&&(
                      <div style={{width:"33%",height:"33%",borderRadius:"50%",
                        background:"rgba(0,0,0,.22)",pointerEvents:"none"}}/>
                    )}
                    {hl&&piece&&!dropTarget&&(
                      <div style={{position:"absolute",inset:0,border:"4px solid rgba(0,0,0,.25)",
                        boxSizing:"border-box",pointerEvents:"none"}}/>
                    )}
                    {piece&&!dragging&&(
                      <span style={{fontSize:"clamp(22px,4.5vw,44px)",lineHeight:1,
                        textShadow:col(piece)==="w"?"0 1px 3px rgba(0,0,0,.5)":"0 1px 2px rgba(0,0,0,.3)",
                        pointerEvents:"none",zIndex:1}}>
                        {PIECES[piece]}
                      </span>
                    )}
                  </div>
                );
              })}

              <div key={`rs${r}`} style={{background:"#2a2010",width:"20px"}}/>
            </>
          ))}

          {/* File labels */}
          <div style={{background:"#2a2010"}}/>
          {FILES.map(f=>(
            <div key={`fl${f}`} style={{background:"#2a2010",color:"#6a5a3a",fontSize:"11px",
              display:"flex",alignItems:"center",justifyContent:"center",height:"20px"}}>{f}</div>
          ))}
          <div style={{background:"#2a2010"}}/>
        </div>

        {/* Right dot */}
        <div style={{position:"absolute",right:"-60px",top:0,bottom:0,width:"12px",
          display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{width:"8px",height:"8px",borderRadius:"50%",transition:"all .3s",
            background:turn==="w"&&!status?.includes("mate")&&status!=="stalemate"?"#e8d5a3":"transparent",
            boxShadow:turn==="w"&&!status?.includes("mate")&&status!=="stalemate"?"0 0 8px #e8d5a3":"none"}}/>
        </div>
      </div>

      {/* Floating ghost piece while dragging */}
      {dragPos&&(
        <div style={{
          position:"fixed",left:dragPos.x,top:dragPos.y,
          transform:"translate(-50%,-50%) scale(1.35)",
          fontSize:"clamp(28px,5vw,52px)",lineHeight:1,
          pointerEvents:"none",zIndex:999,
          filter:"drop-shadow(0 4px 12px rgba(0,0,0,.7))",
          transition:"none"
        }}>
          {PIECES[dragPos.piece]}
        </div>
      )}

      <CapturedBar pieces={grp(capW)} label="White captured"/>

      {/* Status */}
      <div style={{marginTop:"14px",textAlign:"center",minHeight:"50px",
        display:"flex",flexDirection:"column",alignItems:"center",gap:"8px"}}>
        {status==="checkmate"&&(
          <div style={{color:"#e8d5a3",fontSize:"clamp(15px,3vw,21px)",letterSpacing:"0.08em",textTransform:"uppercase"}}>
            🏆 {winnerLabel} wins by checkmate
          </div>
        )}
        {status==="stalemate"&&(
          <div style={{color:"#a0a0b0",fontSize:"clamp(13px,2.5vw,17px)",letterSpacing:"0.06em"}}>½ Draw — Stalemate</div>
        )}
        {status==="check"&&(
          <div style={{color:"#e74c3c",fontSize:"clamp(12px,2vw,15px)",letterSpacing:"0.06em",animation:"pulse 1s infinite"}}>
            ⚠ {turnLabel} is in check
          </div>
        )}
        {!status&&(
          <div style={{color:"#8a7a5a",fontSize:"13px",letterSpacing:"0.06em"}}>{turnLabel}'s turn</div>
        )}
        <button onClick={resetGame} style={{
          background:"transparent",border:"1px solid #4a3a1a",color:"#a08050",
          padding:"6px 20px",cursor:"pointer",letterSpacing:"0.1em",fontSize:"12px",
          textTransform:"uppercase",transition:"all .2s"}}
          onMouseEnter={e=>{e.target.style.background="#2a2010";e.target.style.color="#e8d5a3";}}
          onMouseLeave={e=>{e.target.style.background="transparent";e.target.style.color="#a08050";}}
        >New Game</button>
      </div>

      {/* Move history */}
      {history.length>0&&(
        <div style={{marginTop:"10px",background:"#12121f",border:"1px solid #2a2010",
          padding:"8px 12px",maxWidth:"320px",width:"100%",maxHeight:"72px",overflowY:"auto"}}>
          <p style={{margin:"0 0 4px",color:"#6a5a3a",fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.1em"}}>Moves</p>
          <p style={{margin:0,color:"#8a7a5a",fontSize:"11px",fontFamily:"monospace",lineHeight:1.6}}>
            {history.map((m,i)=>(
              <span key={i}>
                {i%2===0&&<span style={{color:"#4a3a2a",marginRight:"2px"}}>{Math.floor(i/2)+1}.</span>}
                <span style={{marginRight:"6px"}}>{m}</span>
              </span>
            ))}
          </p>
        </div>
      )}

      {/* Promotion modal */}
      {promotion&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",
          display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}}>
          <div style={{background:"#1a1a2e",border:"2px solid #3d3018",padding:"24px",
            textAlign:"center",boxShadow:"0 20px 60px rgba(0,0,0,.8)"}}>
            <p style={{color:"#e8d5a3",fontSize:"14px",letterSpacing:"0.08em",
              textTransform:"uppercase",margin:"0 0 16px"}}>Promote Pawn</p>
            <div style={{display:"flex",gap:"12px",justifyContent:"center"}}>
              {["Q","R","B","N"].map(pt2=>(
                <button key={pt2} onClick={()=>handlePromotion(pt2)} style={{
                  background:"#2a2010",border:"1px solid #4a3a1a",cursor:"pointer",
                  padding:"8px",fontSize:"36px",lineHeight:1,color:"inherit",transition:"background .15s"}}
                  onMouseEnter={e=>e.target.style.background="#3a3020"}
                  onMouseLeave={e=>e.target.style.background="#2a2010"}
                >{PIECES[promotion.pc+pt2]}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:#12121f}
        ::-webkit-scrollbar-thumb{background:#3a3020}
      `}</style>
    {/* Footer */}
      <footer
        style={{
          backgroundColor: "#12121f",
          color: "#e8d5a3",
          padding: "1.5rem",
          textAlign: "center",
          fontFamily: "Georgia, serif",
          borderTop: "2px solid #3d3018",
          marginTop: "2rem",
          width: "100%"
        }}
      >
        <p style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>
          © 2026 <strong>Anshul Bhilare</strong>. All rights reserved.
        </p>

        <p style={{ color: "#8a7a5a", margin: 0 }}>
          ♟ Chess Game • Pass & Play
        </p>
      </footer>

    </div>
  );
}

function CapturedBar({pieces,label}){
  const entries=Object.entries(pieces);
  if(!entries.length)return <div style={{height:"28px"}}/>;
  return (
    <div style={{display:"flex",alignItems:"center",gap:"6px",padding:"4px 8px",margin:"4px 0",minHeight:"28px"}}>
      <span style={{color:"#6a5a3a",fontSize:"10px",letterSpacing:"0.08em",textTransform:"uppercase",marginRight:"4px"}}>
        {label}:
      </span>
      {entries.map(([p,n])=>(
        <span key={p} style={{fontSize:"18px",lineHeight:1,opacity:.85}}>
          {PIECES[p]}{n>1?<sup style={{fontSize:"9px",color:"#8a7a5a"}}>×{n}</sup>:null}
        </span>
      ))}
    </div>
  );
}
