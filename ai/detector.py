from ultralytics import YOLO
import cv2
import time
import requests


# =========================
# SETTINGS
# =========================

VIDEO_PATH = "crowd.mp4"

BACKEND_URL = "http://localhost:5000/api/cameras/1"


# =========================
# LOAD YOLO
# =========================

model = YOLO("yolo11n.pt")


# =========================
# OPEN VIDEO
# =========================

cap = cv2.VideoCapture(VIDEO_PATH)


if not cap.isOpened():
    print("Could not open video")
    exit()


print("Video started")
print("People count will be sent every second")
print("Press Ctrl+C to stop")


# =========================
# TIMER
# =========================

last_print_time = time.time()


# =========================
# DETECTION LOOP
# =========================

try:

    while True:

        success, frame = cap.read()


        if not success:
            print("\nVideo finished")
            break


        # Run YOLO
        results = model(
            frame,
            verbose=False
        )


        # Count people
        people_count = 0


        for result in results:

            for box in result.boxes:

                class_id = int(box.cls[0])


                # COCO class 0 = person
                if class_id == 0:

                    people_count += 1


        # Current time
        current_time = time.time()


        # =========================
        # EVERY SECOND
        # =========================

        if current_time - last_print_time >= 1:


            # Density
            if people_count <= 10:

                density = "LOW"

            elif people_count <= 30:

                density = "MEDIUM"

            else:

                density = "HIGH"


            # Risk
            if density == "LOW":

                risk = "LOW"

            elif density == "MEDIUM":

                risk = "MEDIUM"

            else:

                risk = "HIGH"


            # Recommendation
            if risk == "LOW":

                recommendation = (
                    "Continue normal monitoring"
                )

            elif risk == "MEDIUM":

                recommendation = (
                    "Monitor crowd movement closely"
                )

            else:

                recommendation = (
                    "Redirect visitors and control crowd flow"
                )


            # =========================
            # PRINT RESULT
            # =========================

            print(
                f"People: {people_count} | "
                f"Density: {density} | "
                f"Risk: {risk} | "
                f"Action: {recommendation}"
            )


            # =========================
            # SEND TO NODE.JS
            # =========================

            data = {

                "people": people_count,

                "density": density,

                "movement": "NORMAL",

                "risk": risk,

                "recommendation": recommendation

            }


            try:

                response = requests.put(

                    BACKEND_URL,

                    json=data,

                    timeout=3

                )


                if response.ok:

                    print(
                        "Backend updated successfully"
                    )

                else:

                    print(
                        f"Backend error: "
                        f"{response.status_code}"
                    )


            except requests.RequestException as error:

                print(
                    f"Backend connection failed: {error}"
                )


            # Update timer
            last_print_time = current_time


# =========================
# STOP WITH CTRL+C
# =========================

except KeyboardInterrupt:

    print("\nStopping detector...")


# =========================
# CLEANUP
# =========================

finally:

    cap.release()

    print("Detection stopped")