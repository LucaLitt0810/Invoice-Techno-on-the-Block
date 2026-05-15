DO $$
DECLARE
    v_template_id UUID;
    section_id UUID;
    existing_sections INTEGER;
BEGIN
    SELECT id INTO v_template_id FROM dj_rider_templates WHERE is_default = true LIMIT 1;

    IF v_template_id IS NULL THEN
        RETURN;
    END IF;

    -- Check if sections already exist for this template
    SELECT COUNT(*) INTO existing_sections FROM dj_rider_template_sections WHERE template_id = v_template_id;

    IF existing_sections > 0 THEN
        RETURN;
    END IF;

    -- Section: Show
    INSERT INTO dj_rider_template_sections (template_id, name, sort_order)
    VALUES (v_template_id, 'Show', 10)
    RETURNING id INTO section_id;

    INSERT INTO dj_rider_template_fields (section_id, label, field_type, sort_order) VALUES
    (section_id, 'Artist', 'text', 10),
    (section_id, 'Name of event', 'text', 20),
    (section_id, 'Event website', 'url', 30),
    (section_id, 'Capacity', 'number', 40),
    (section_id, 'Doors open', 'time', 50),
    (section_id, 'Doors close', 'time', 60),
    (section_id, 'Age restrictions', 'text', 70);

    -- Section: Promoter
    INSERT INTO dj_rider_template_sections (template_id, name, sort_order)
    VALUES (v_template_id, 'Promoter', 20)
    RETURNING id INTO section_id;

    INSERT INTO dj_rider_template_fields (section_id, label, field_type, sort_order) VALUES
    (section_id, 'Company name', 'text', 10),
    (section_id, 'Address line 1', 'text', 20),
    (section_id, 'Address line 2', 'text', 30),
    (section_id, 'Postal code', 'text', 40),
    (section_id, 'City', 'text', 50),
    (section_id, 'Country', 'text', 60);

    -- Section: Arrival
    INSERT INTO dj_rider_template_sections (template_id, name, sort_order)
    VALUES (v_template_id, 'Arrival', 30)
    RETURNING id INTO section_id;

    INSERT INTO dj_rider_template_fields (section_id, label, field_type, placeholder, sort_order) VALUES
    (section_id, 'Arrival', 'textarea', 'Flight details, arrival notes', 10),
    (section_id, 'Meeting Point', 'text', NULL, 20),
    (section_id, 'Driver', 'text', 'name + mobile + cartype', 30),
    (section_id, 'Duration', 'text', NULL, 40);

    -- Section: Departure
    INSERT INTO dj_rider_template_sections (template_id, name, sort_order)
    VALUES (v_template_id, 'Departure', 40)
    RETURNING id INTO section_id;

    INSERT INTO dj_rider_template_fields (section_id, label, field_type, sort_order) VALUES
    (section_id, 'Transfer Hotel->Airport pick-up time', 'time', 10),
    (section_id, 'Meeting Point', 'text', 20),
    (section_id, 'Driver', 'text', 30),
    (section_id, 'Departure', 'textarea', 40);

    -- Section: Show Transfers
    INSERT INTO dj_rider_template_sections (template_id, name, sort_order)
    VALUES (v_template_id, 'Show Transfers', 50)
    RETURNING id INTO section_id;

    INSERT INTO dj_rider_template_fields (section_id, label, field_type, sort_order) VALUES
    (section_id, 'Transfer Hotel->Venue pick-up time', 'time', 10),
    (section_id, 'Meeting Point', 'text', 20),
    (section_id, 'Driver', 'text', 30),
    (section_id, 'Duration', 'text', 40),
    (section_id, 'Transfer Venue->Hotel pick-up time', 'time', 50),
    (section_id, 'Meeting Point', 'text', 60),
    (section_id, 'Driver', 'text', 70);

    -- Section: Hotel
    INSERT INTO dj_rider_template_sections (template_id, name, sort_order)
    VALUES (v_template_id, 'Hotel', 60)
    RETURNING id INTO section_id;

    INSERT INTO dj_rider_template_fields (section_id, label, field_type, sort_order) VALUES
    (section_id, 'Booking Code', 'text', 10),
    (section_id, 'Hotel Info', 'text', 20),
    (section_id, 'Room Category', 'text', 30),
    (section_id, 'Check In', 'datetime', 40),
    (section_id, 'Check out', 'datetime', 50),
    (section_id, 'Inclusive', 'text', 60),
    (section_id, 'Check-In/Out Times Confirmed', 'boolean', 70);

    -- Section: Dinner
    INSERT INTO dj_rider_template_sections (template_id, name, sort_order)
    VALUES (v_template_id, 'Dinner', 70)
    RETURNING id INTO section_id;

    INSERT INTO dj_rider_template_fields (section_id, label, field_type, placeholder, sort_order) VALUES
    (section_id, 'Restaurant', 'text', 'name + address + link', 10),
    (section_id, 'Pick-Up Time', 'time', NULL, 20),
    (section_id, 'Meeting Point', 'text', NULL, 30),
    (section_id, 'Driver', 'text', NULL, 40);

    -- Section: Soundcheck
    INSERT INTO dj_rider_template_sections (template_id, name, sort_order)
    VALUES (v_template_id, 'Soundcheck', 80)
    RETURNING id INTO section_id;

    INSERT INTO dj_rider_template_fields (section_id, label, field_type, sort_order) VALUES
    (section_id, 'Pick-Up Time', 'time', 10),
    (section_id, 'Meeting Point', 'text', 20),
    (section_id, 'Driver', 'text', 30);
END $$;
