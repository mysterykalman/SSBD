(function(global) {
"use strict";
// Contract: start() -> {kind:"question",text,number,maxQuestions,questionId}
// answer(value) -> question or {kind:"guess",text,guess}
// confirm(correct) -> {kind:"result",correct}; reset() -> void.
// Until a properly licensed mature engine is connected, no fake inference.
global.MomModeAdapter=Object.freeze({
 connected:false,
 supportedAnswers:["yes","no","probably","unknown"],
 start(){throw Error("Mom Mode engine not connected");},
 answer(){throw Error("Mom Mode engine not connected");},
 confirm(){throw Error("Mom Mode engine not connected");},
 reset(){}
});
})(window);
