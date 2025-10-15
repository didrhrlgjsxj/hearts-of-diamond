# Hearts of Diamond

This is a simple 2D top-view demo built with HTML5 canvas and plain JavaScript.

## Running

Open `index.html` in a modern web browser. Use the mouse wheel to zoom in and out. Moving the mouse to the edge of the screen scrolls the camera in that direction.

Armies파일에 있는 파일들은 주로 전체적인 부대 단위의 로직들


Nemos파일에 있는 파일들은 네모라는 객체와 그의 작동방식

Nemo : Armies에 소속되어있는 실질적으로 전투를 하는 하나하나의 객체들.

최적화를 위해서 모든 Nemo를 항상 로드 하지 않고, 그저 카메라의 줌 정도에 따라
전체적인 전장의 상황을 볼 때는 오로지 유닛들만이 보이다가 줌을 확대하면 천천히 그에
소속된 네모들을 즉석으로 랜더링 하여 어떤 식으로 돌아가는지 시각적으로 보여주기 위한 장치
항상 모든 네모를 랜더링 하지 않고, 플레이어가 그곳을 바라볼 때만 즉석으로 랜더링.

조직력 제대로. 중대들이 조직력이0임 통합 제대로 하기
