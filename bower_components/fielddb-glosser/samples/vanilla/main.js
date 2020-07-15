var loadExamples = function() {
  var graphWordBoundaries = document.getElementById("graphWordBoundaries");
  var showWordBoundaries;
  if (graphWordBoundaries && graphWordBoundaries.checked) {
    showWordBoundaries = true;
  } else {
    showWordBoundaries = false;
  }

  var rerenderIfWordBoundariesChange = [];
  graphWordBoundaries.onchange = function() {
    if (graphWordBoundaries && graphWordBoundaries.checked) {
      showWordBoundaries = true;
    } else {
      showWordBoundaries = false;
    }
    for (var functionToCall = 0; functionToCall < rerenderIfWordBoundariesChange.length; functionToCall++) {
      rerenderIfWordBoundariesChange[functionToCall]();
    }
  };

  var url = "https://corpusdev.lingsync.org";
  var firstdb = "glossersample-quechua";
  var firstGlosser = new Glosser({
    pouchname: firstdb,
    localDocument: window.document
  });
  firstGlosser.downloadPrecedenceRules(firstdb, url + "/" + firstdb + "/_design/lexicon2.2.0/_view/morphemesPrecedenceContext?group=true", function(precedenceRelations) {
    var utterance = firstGlosser.guessUtteranceFromMorphemes({
      utterance: "",
      morphemes: "Kicha-nay-wa-n punqo-ta",
      allomorphs: "",
      gloss: "open-DES-1OM-3SG door-ACC",
      translation: "I feel like opening the door."
    });
    console.log(utterance);
    var lexicon = LexiconFactory({
      precedenceRelations: precedenceRelations,
      dbname: firstdb,
      element: document.getElementById("lexicon"),
      dontConnectWordBoundaries: !showWordBoundaries,
      localDOM: window.document,
      url: url+ "/" + firstdb
    });
    lexicon.bindToView();
    var renderFirstGraph = function() {
      var glosserElement = document.getElementById("glosser");
      glosserElement.innerHTML = "";
      var confidenceThreshold = document.getElementById("lexiconConfidenceThreshold").value /10;
      firstGlosser.visualizePrecedenceRelationsAsForceDirectedGraph(lexicon, glosserElement, !showWordBoundaries, confidenceThreshold);
    };
    rerenderIfWordBoundariesChange.push(renderFirstGraph);
    renderFirstGraph();
  });

  var seconddb = "glossersample-cherokee";
  var secondGlosser = new Glosser({
    pouchname: seconddb,
    localDocument: window.document
  });
  secondGlosser.downloadPrecedenceRules(seconddb, url + "/" + seconddb + "/_design/lexicon2.2.0/_view/morphemesPrecedenceContext?group=true", function(precedenceRelations) {
    var lexicon = LexiconFactory({
      precedenceRelations: precedenceRelations,
      dbname: seconddb,
      element: document.getElementById("lexicon2"),
      dontConnectWordBoundaries: !showWordBoundaries,
      localDOM: window.document,
      url: url+ "/" + seconddb
    });
    lexicon.bindToView();

    var renderSecondGraph = function() {
      var glosserElement = document.getElementById("glosser2");
      glosserElement.innerHTML = "";
      var confidenceThreshold = document.getElementById("lexiconConfidenceThreshold").value /10;
      secondGlosser.visualizePrecedenceRelationsAsForceDirectedGraph(lexicon, glosserElement, !showWordBoundaries, confidenceThreshold);
    };
    rerenderIfWordBoundariesChange.push(renderSecondGraph);
    renderSecondGraph();
  });

  var thirddb = "glossersample-inuktitut";
  var thirdGlosser = new Glosser({
    pouchname: thirddb,
    localDocument: window.document
  });
  thirdGlosser.downloadPrecedenceRules(thirddb, url + "/" + thirddb + "/_design/lexicon2.2.0/_view/morphemesPrecedenceContext?group=true&limit=1000", function(precedenceRelations) {
    var lexicon = LexiconFactory({
      precedenceRelations: precedenceRelations,
      dbname: thirddb,
      element: document.getElementById("lexicon3"),
      dontConnectWordBoundaries: !showWordBoundaries,
      localDOM: window.document
    });
    lexicon.bindToView();

    var renderThirdGraph = function() {
      var glosserElement = document.getElementById("glosser3");
      glosserElement.innerHTML = "";
      var confidenceThreshold = document.getElementById("lexiconConfidenceThreshold").value /10;
      thirdGlosser.visualizePrecedenceRelationsAsForceDirectedGraph(lexicon, glosserElement, !showWordBoundaries, confidenceThreshold);
    };
    rerenderIfWordBoundariesChange.push(renderThirdGraph);
    renderThirdGraph();
  });

};

var refreshButton = document.getElementById("refreshButton");
refreshButton.onclick = loadExamples;


var showGlosserAsGraph = document.getElementById("showGlosserAsGraph");
showGlosserAsGraph.onchange = function(){
  document.getElementById("glosser").hidden = !showGlosserAsGraph.checked;
  document.getElementById("glosser2").hidden = !showGlosserAsGraph.checked;
  document.getElementById("glosser3").hidden = !showGlosserAsGraph.checked;
};


var showLexiconAsList = document.getElementById("showLexiconAsList");
showLexiconAsList.onchange = function(){
  document.getElementById("lexicon").hidden = !showLexiconAsList.checked;
  document.getElementById("lexicon2").hidden = !showLexiconAsList.checked;
  document.getElementById("lexicon3").hidden = !showLexiconAsList.checked;
};

loadExamples();
