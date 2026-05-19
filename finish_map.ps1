# Đợi tiến trình osrm-extract (đang chạy trong nền) kết thúc.
cd data
docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-partition /data/map.osrm
docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-customize /data/map.osrm
docker restart osrm