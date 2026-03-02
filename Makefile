include .env.target
export

.PHONY: update-prod
update-prod:
	rsync -avP --delete --exclude .git --exclude .DS_Store ./ $(TARGET_HOST):${TARGET_PATH}/
	ssh $(TARGET_HOST) "cd ${TARGET_PATH}; ./setup-prod.sh; docker ps"

.PHONY: update-dev
update-dev:
	./setup-dev.sh
	docker ps

# TODO: This is not working
.PHONY: reset-prod
reset-prod:
	rsync -avP --delete --exclude .git --exclude .DS_Store ./ $(TARGET_HOST):${TARGET_PATH}/
	ssh $(TARGET_HOST) "cd ${TARGET_PATH}; ./setup-prod.sh reset; docker ps"

.PHONY: reset-dev
reset-dev:
	./setup-dev.sh reset
	docker ps
