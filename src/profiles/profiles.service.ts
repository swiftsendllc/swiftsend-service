import { ProfilesEntity } from "../entities/profiles.entity";
import { db } from "../rdb/mongodb";
import { Collections } from "../util/constants";

const profiles = db.collection<ProfilesEntity>(Collections.PROFILES)
