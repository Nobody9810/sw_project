Core.setWorkerPath('../../../lib/core');

const flipbookElement = document.getElementById('flipbook');
const loadingMessageElement = document.getElementById('loading-message');
loadingMessageElement.innerHTML = 'Preparing document...';
const source = 'https://pdftron.s3.amazonaws.com/downloads/pl/Cheetahs.pdf';
const options = { l: window.sampleL /* license key here */ };
const docViewer = new Core.DocumentViewer();
const viewerElement = document.createElement('div');

docViewer.setViewerElement(viewerElement);
docViewer.setScrollViewElement(viewerElement);
docViewer.enableAnnotations();
docViewer.addEventListener('annotationsLoaded', () => {
  const doc = docViewer.getDocument();
  const annotManager = docViewer.getAnnotationManager();
  const info = doc.getPageInfo(1);
  const width = info.width;
  const height = info.height;
  const pageCount = doc.getPageCount();
  const promises = [];
  const canvases = [];
  const boundingRect = flipbookElement.getBoundingClientRect();

  let flipbookHeight = boundingRect.height;
  let flipbookWidth = boundingRect.width;
  if (((flipbookHeight * width) / height) * 2 < flipbookWidth) {
    flipbookWidth = ((flipbookHeight * width) / height) * 2;
  } else {
    flipbookHeight = ((flipbookWidth / width) * height) / 2;
  }

  for (let i = 0; i < pageCount; i++) {
    promises.push(
      /* eslint-disable-next-line no-loop-func */
      new Promise(resolve => {
        // Load page canvas
        const pageNumber = i + 1;
        return doc.requirePage(pageNumber).then(() => {
          return doc.loadCanvas({
            pageNumber,
            drawComplete: async (canvas, index) => {
              canvases.push({ index, canvas });
              loadingMessageElement.innerHTML = `Loading page canvas... (${canvases.length}/${pageCount})`;
              await annotManager.drawAnnotations(index, canvas);
              resolve();
            },
          });
        });
      })
    );
  }

  Promise.all(promises).then(() => {
    flipbookElement.removeChild(loadingMessageElement);
    flipbookElement.style.margin = '60px 0px 0px auto';

    canvases.sort((a, b) => a.index - b.index).forEach(o => flipbookElement.appendChild(o.canvas));

    $('#flipbook').turn({
      width: flipbookWidth,
      height: flipbookHeight,
    });

    setTimeout(() => {
      $('#flipbook').turn('next');
    }, 500);

    document.getElementById('previous').onclick = () => {
      $('#flipbook').turn('previous');
    };

    document.getElementById('next').onclick = () => {
      $('#flipbook').turn('next');
    };
  });
});
docViewer.loadDocument(source, options);